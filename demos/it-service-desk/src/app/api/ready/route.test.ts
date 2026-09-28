import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TicketStore } from "@/lib/ticket-store";
import { GET as health } from "../health/route";

const getTicketStore = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ticket-store", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/ticket-store")>(),
  getTicketStore,
}));

const directories: string[] = [];
const stores: TicketStore[] = [];

function requireReadyRoute() {
  const routePath = fileURLToPath(new URL("./route.ts", import.meta.url));
  expect(existsSync(routePath), "GET /api/ready must have a route").toBe(true);
  const modulePath: string = "./route";
  return import(modulePath) as Promise<{
    GET: () => Response | Promise<Response>;
    dynamic: string;
  }>;
}

function databaseFile() {
  const directory = mkdtempSync(join(tmpdir(), "service-desk-ready-"));
  directories.push(directory);
  return join(directory, "service-desk.db");
}

function useStore(filename: string, seed = true) {
  const store = new TicketStore(filename, seed);
  stores.push(store);
  getTicketStore.mockReturnValue(store);
  return store;
}

function closeStore(store: TicketStore) {
  stores.splice(stores.indexOf(store), 1);
  store.close();
}

function readRows(filename: string) {
  const database = new DatabaseSync(filename, { readOnly: true });
  try {
    return database.prepare("SELECT * FROM tickets ORDER BY id").all();
  } finally {
    database.close();
  }
}

async function expectResponse(response: Response, status: number, body: object) {
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual(body);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
}

beforeEach(() => {
  getTicketStore.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
  while (stores.length) stores.pop()?.close();
  while (directories.length) rmSync(directories.pop()!, { recursive: true, force: true });
});

describe("GET /api/ready", () => {
  it("reports exact readiness after an application ticket summary read", async () => {
    const { GET } = await requireReadyRoute();
    const summary = vi.fn().mockReturnValue({ open: 0 });
    getTicketStore.mockReturnValue({ summary });

    await expectResponse(await GET(), 200, { status: "ready" });
    expect(getTicketStore).toHaveBeenCalledOnce();
    expect(summary).toHaveBeenCalledOnce();
  });

  it("reports exact unavailability when the store cannot initialize", async () => {
    const { GET } = await requireReadyRoute();
    getTicketStore.mockImplementation(() => {
      throw new Error("initialization failed");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expectResponse(await GET(), 503, { status: "unavailable" });
    expect(getTicketStore).toHaveBeenCalledOnce();
  });

  it("reports exact unavailability when the summary read fails", async () => {
    const { GET } = await requireReadyRoute();
    const summary = vi.fn().mockImplementation(() => {
      throw new Error("query failed");
    });
    getTicketStore.mockReturnValue({ summary });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expectResponse(await GET(), 503, { status: "unavailable" });
    expect(getTicketStore).toHaveBeenCalledOnce();
    expect(summary).toHaveBeenCalledOnce();
  });

  it("logs one fixed generic failure without sensitive details", async () => {
    const { GET } = await requireReadyRoute();
    const error = new Error(
      "****** /secret/tickets.db INC-0042 ticket content",
    );
    getTicketStore.mockImplementation(() => {
      throw error;
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET();
    await expectResponse(response, 503, { status: "unavailable" });
    expect(log).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith("Service desk readiness check failed");
    expect(JSON.stringify(log.mock.calls)).not.toContain(error.message);
    expect(JSON.stringify(log.mock.calls)).not.toContain(error.stack);
  });

  it("retries failed initialization after storage is repaired", async () => {
    const { GET } = await requireReadyRoute();
    const filename = databaseFile();
    const blockedDatabase = join(filename, "service-desk.db");
    writeFileSync(filename, "not a directory");
    getTicketStore.mockImplementation(() => useStore(blockedDatabase, false));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expectResponse(await GET(), 503, { status: "unavailable" });
    rmSync(filename);
    await expectResponse(await GET(), 200, { status: "ready" });
    expect(getTicketStore).toHaveBeenCalledTimes(2);
  });

  it("performs a fresh summary read on every successful request", async () => {
    const { GET } = await requireReadyRoute();
    const summary = vi.fn().mockReturnValue({ open: 0 });
    getTicketStore.mockReturnValue({ summary });

    await expectResponse(await GET(), 200, { status: "ready" });
    await expectResponse(await GET(), 200, { status: "ready" });
    expect(getTicketStore).toHaveBeenCalledTimes(2);
    expect(summary).toHaveBeenCalledTimes(2);
  });

  it("forces dynamic evaluation rather than prerendering readiness", async () => {
    const route = await requireReadyRoute();

    expect(route.dynamic).toBe("force-dynamic");
  });

  it("rejects an invalid database path while preserving liveness", async () => {
    const { GET } = await requireReadyRoute();
    getTicketStore.mockImplementation(() => useStore("/dev/null/service-desk.db"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await expectResponse(await GET(), 503, { status: "unavailable" });
    const healthResponse = health();
    expect(healthResponse.status).toBe(200);
    expect(await healthResponse.json()).toEqual({ status: "ok" });
    expect(log).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith("Service desk readiness check failed");
    expect(JSON.stringify(log.mock.calls)).not.toContain("/dev/null/service-desk.db");
  });

  it("allows first-use schema creation and database seeding", async () => {
    const { GET } = await requireReadyRoute();
    const filename = databaseFile();
    getTicketStore.mockImplementation(() => useStore(filename));

    await expectResponse(await GET(), 200, { status: "ready" });
    const database = new DatabaseSync(filename, { readOnly: true });
    try {
      expect(database.prepare("SELECT COUNT(*) AS count FROM tickets").get()).toEqual({
        count: 4,
      });
      expect(database.prepare("PRAGMA table_info(tickets)").all()).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: "owner" })]),
      );
    } finally {
      database.close();
    }
  });

  it("allows nullable ownership migration during first readiness", async () => {
    const { GET } = await requireReadyRoute();
    const filename = databaseFile();
    const database = new DatabaseSync(filename);
    try {
      database.exec(`CREATE TABLE tickets (
        id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL,
        category TEXT NOT NULL, priority TEXT NOT NULL, status TEXT NOT NULL,
        requester_name TEXT NOT NULL, requester_email TEXT NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      )`);
      database.prepare(`INSERT INTO tickets VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        "Preserve title",
        "Preserve description",
        "Access and identity",
        "high",
        "open",
        "Person",
        "person@example.com",
        "2026-01-01",
        "2026-01-02",
      );
    } finally {
      database.close();
    }
    const before = readRows(filename);
    getTicketStore.mockImplementation(() => useStore(filename));

    await expectResponse(await GET(), 200, { status: "ready" });
    expect(readRows(filename)).toEqual(before.map((row) => ({ ...row, owner: null })));
  });

  it("preserves every persisted ticket field across repeated probes", async () => {
    const { GET } = await requireReadyRoute();
    const filename = databaseFile();
    const store = useStore(filename);
    store.updateOwner(1, "avery-stone");
    store.updateStatus(2, "closed");
    const before = readRows(filename);

    await expectResponse(await GET(), 200, { status: "ready" });
    await expectResponse(await GET(), 200, { status: "ready" });
    closeStore(store);

    expect(readRows(filename)).toEqual(before);
  });
});
