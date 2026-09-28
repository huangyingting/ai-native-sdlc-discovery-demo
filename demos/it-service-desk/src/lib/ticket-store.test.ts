import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import type { CreateTicketInput, Ticket } from "./ticket";
import { TicketStore } from "./ticket-store";

const openStores: TicketStore[] = [];
const temporaryDirectories: string[] = [];

type TicketOwner = "avery-stone" | "jordan-lee";
type OwnedTicket = Ticket & { owner: TicketOwner | null };
type OwnershipStore = TicketStore & {
  updateOwner(id: number, owner: TicketOwner | "" | null): unknown;
  list(filters?: Parameters<TicketStore["list"]>[0] & {
    owner?: TicketOwner | "unassigned";
  }): OwnedTicket[];
};

const legacyFixtures = [
  [1, "Cannot connect to corporate VPN", "The VPN client stops at 80% and reports that the gateway is unavailable.", "Network and connectivity", "high", "open", "Maya Chen", "maya.chen@example.com", "2026-09-25T01:20:00.000Z", "2026-09-25T01:20:00.000Z"],
  [2, "Request access to finance reporting", "Please add read-only access to the monthly finance reporting workspace.", "Access and identity", "medium", "in_progress", "Daniel Foster", "daniel.foster@example.com", "2026-09-24T07:45:00.000Z", "2026-09-25T00:10:00.000Z"],
  [3, "Teams microphone is not detected", "The built-in microphone works in Windows settings but is unavailable in Teams calls.", "Email and collaboration", "low", "resolved", "Priya Shah", "priya.shah@example.com", "2026-09-23T03:30:00.000Z", "2026-09-24T09:15:00.000Z"],
  [4, "Executive laptop will not start", "The laptop shows a blank screen after the latest firmware update.", "Device and hardware", "critical", "open", "Alex Morgan", "alex.morgan@example.com", "2026-09-25T02:05:00.000Z", "2026-09-25T02:05:00.000Z"],
] as const;

function createTestStore(filename = ":memory:", seed = false) {
  const ticketStore = new TicketStore(filename, seed);
  openStores.push(ticketStore);
  return ticketStore;
}

function closeTestStore(ticketStore: TicketStore) {
  openStores.splice(openStores.indexOf(ticketStore), 1);
  ticketStore.close();
}

function requireOwnershipStore(ticketStore: TicketStore) {
  const ownershipStore = ticketStore as OwnershipStore;
  expect(typeof ownershipStore.updateOwner).toBe("function");
  return ownershipStore;
}

function createLegacyDatabase() {
  const directory = mkdtempSync(join(tmpdir(), "ticket-ownership-"));
  temporaryDirectories.push(directory);
  const filename = join(directory, "service-desk.db");
  const database = new DatabaseSync(filename);
  database.exec(`
    CREATE TABLE tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
      status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
      requester_name TEXT NOT NULL,
      requester_email TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const insert = database.prepare(`
    INSERT INTO tickets (
      id, title, description, category, priority, status,
      requester_name, requester_email, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const fixture of legacyFixtures) insert.run(...fixture);
  const rows = database.prepare("SELECT * FROM tickets ORDER BY id").all();
  database.close();
  return { filename, rows };
}

function withoutOwnershipUpdate(ticket: OwnedTicket) {
  const snapshot = { ...ticket } as Partial<OwnedTicket>;
  delete snapshot.owner;
  delete snapshot.updatedAt;
  return snapshot;
}

function dataVersion(database: DatabaseSync) {
  return (database.prepare("PRAGMA data_version").get() as { data_version: number }).data_version;
}

afterEach(() => {
  while (openStores.length) openStores.pop()?.close();
  while (temporaryDirectories.length) {
    rmSync(temporaryDirectories.pop()!, { force: true, recursive: true });
  }
});

describe("TicketStore", () => {
  it("creates and retrieves a ticket", () => {
    const ticketStore = createTestStore();
    const created = ticketStore.create({
      title: "Cannot reset my password",
      description: "The password reset link reports that it has expired.",
      category: "Access and identity",
      priority: "high",
      requesterName: "Jordan Lee",
      requesterEmail: "jordan.lee@example.com",
    });

    expect(created.reference).toBe("INC-0001");
    expect(created.status).toBe("open");
    expect(ticketStore.find(created.id)).toEqual(created);
  });

  it("filters tickets by status, priority, and query", () => {
    const ticketStore = createTestStore();
    const vpn = ticketStore.create({
      title: "VPN is unavailable",
      description: "The VPN connection fails before authentication completes.",
      category: "Network and connectivity",
      priority: "critical",
      requesterName: "Taylor Kim",
      requesterEmail: "taylor.kim@example.com",
    });
    ticketStore.create({
      title: "Install design software",
      description: "Please install the approved design package on my laptop.",
      category: "Business applications",
      priority: "low",
      requesterName: "Morgan Bell",
      requesterEmail: "morgan.bell@example.com",
    });
    ticketStore.updateStatus(vpn.id, "in_progress");

    expect(ticketStore.list({ status: "in_progress" })).toHaveLength(1);
    expect(ticketStore.list({ priority: "critical" })[0].id).toBe(vpn.id);
    expect(ticketStore.list({ query: "VPN" }).map((ticket) => ticket.id)).toEqual([vpn.id]);
    expect(ticketStore.list({ query: "taylor" })[0].id).toBe(vpn.id);
    expect(ticketStore.list({ query: "  TaYLoR  " }).map((ticket) => ticket.id)).toEqual([vpn.id]);
  });

  it.each(["INC-0001", "inc-0001", "  Inc-0001  ", "0001", "1", "inc-1"])(
    "finds a ticket by normalized reference or ID: %j",
    (query) => {
      const ticketStore = createTestStore();
      const created = ticketStore.create({
        title: "Cannot reset my password",
        description: "The password reset link reports that it has expired.",
        category: "Access and identity",
        priority: "high",
        requesterName: "Jordan Lee",
        requesterEmail: "jordan.lee@example.com",
      });
      ticketStore.create({
        title: "Install design software",
        description: "Please install the approved design package on my laptop.",
        category: "Business applications",
        priority: "low",
        requesterName: "Morgan Bell",
        requesterEmail: "morgan.bell@example.com",
      });

      expect(ticketStore.list({ query }).map((ticket) => ticket.id)).toEqual([created.id]);
      expect(ticketStore.list({ query, status: "open", priority: "high" })).toHaveLength(1);
      expect(ticketStore.list({ query, status: "closed" })).toEqual([]);
      expect(ticketStore.list({ query, priority: "low" })).toEqual([]);
      expect(ticketStore.list({ query: "INC-9999" })).toEqual([]);
    },
  );

  it("matches displayed references beyond four digits", () => {
    const ticketStore = createTestStore();
    let created;
    for (let index = 0; index < 10000; index += 1) {
      created = ticketStore.create({
        title: "Cannot reset my password",
        description: "The password reset link reports that it has expired.",
        category: "Access and identity",
        priority: "high",
        requesterName: "Jordan Lee",
        requesterEmail: "jordan.lee@example.com",
      });
    }
    expect(created?.reference).toBe("INC-10000");
    expect(ticketStore.list({ query: "INC-10000" }).map((ticket) => ticket.id)).toEqual([10000]);
  });

  it("updates summary counts when ticket status changes", () => {
    const ticketStore = createTestStore();
    const created = ticketStore.create({
      title: "Laptop display flickers",
      description: "The display flickers whenever the laptop is connected to a dock.",
      category: "Device and hardware",
      priority: "high",
      requesterName: "Sam Rivera",
      requesterEmail: "sam.rivera@example.com",
    });

    expect(ticketStore.summary()).toEqual({ open: 1, inProgress: 0, resolved: 0, urgent: 1 });
    ticketStore.updateStatus(created.id, "resolved");
    expect(ticketStore.summary()).toEqual({ open: 0, inProgress: 0, resolved: 1, urgent: 0 });
  });

  it("migrates a persisted ownerless database without changing legacy ticket data", () => {
    const { filename, rows: before } = createLegacyDatabase();
    const ticketStore = createTestStore(filename);
    try {
      const tickets = ticketStore.list() as OwnedTicket[];
      expect(tickets.every((ticket) => Object.hasOwn(ticket, "owner"))).toBe(true);
      expect(tickets.map((ticket) => ticket.owner)).toEqual([null, null, null, null]);
      expect(ticketStore.summary()).toEqual({ open: 2, inProgress: 1, resolved: 1, urgent: 2 });

      const database = new DatabaseSync(filename);
      try {
        expect(database.prepare("SELECT owner FROM tickets ORDER BY id").all()).toEqual([
          { owner: null },
          { owner: null },
          { owner: null },
          { owner: null },
        ]);
        expect(database.prepare(`
          SELECT id, title, description, category, priority, status,
            requester_name, requester_email, created_at, updated_at
          FROM tickets ORDER BY id
        `).all()).toEqual(before);
      } finally {
        database.close();
      }
    } finally {
      if (openStores.includes(ticketStore)) closeTestStore(ticketStore);
    }
  });

  it("persists every ownership transition without changing unrelated fields or regressing timestamps", () => {
    const { filename } = createLegacyDatabase();
    const futureTimestamp = "2099-12-31T23:59:59.999Z";
    const database = new DatabaseSync(filename);
    try {
      database.prepare("UPDATE tickets SET updated_at = ? WHERE id = 1").run(futureTimestamp);
    } finally {
      database.close();
    }
    let ticketStore: TicketStore | undefined;
    try {
      ticketStore = createTestStore(filename);
      let ownershipStore = requireOwnershipStore(ticketStore);

      const transition = (owner: TicketOwner | "") => {
        const before = ownershipStore.find(1) as OwnedTicket;
        ownershipStore.updateOwner(1, owner);
        const after = ownershipStore.find(1) as OwnedTicket;
        expect(after.owner).toBe(owner || null);
        expect(withoutOwnershipUpdate(after)).toEqual(withoutOwnershipUpdate(before));
        expect(after.updatedAt >= before.updatedAt).toBe(true);
        closeTestStore(ticketStore!);
        ticketStore = createTestStore(filename);
        ownershipStore = requireOwnershipStore(ticketStore);
        expect(ownershipStore.find(1)).toEqual(after);
      };

      transition("avery-stone");
      transition("jordan-lee");
      transition("");
    } finally {
      if (ticketStore && openStores.includes(ticketStore)) closeTestStore(ticketStore);
    }
  });

  it("performs no database write for repeated assigned and unassigned ownership", () => {
    const { filename } = createLegacyDatabase();
    let ticketStore: TicketStore | undefined;
    let observer: DatabaseSync | undefined;
    try {
      ticketStore = createTestStore(filename);
      const ownershipStore = requireOwnershipStore(ticketStore);
      observer = new DatabaseSync(filename);

      const unassigned = ownershipStore.find(1) as OwnedTicket;
      const beforeUnassignedNoop = dataVersion(observer);
      ownershipStore.updateOwner(1, "");
      expect(dataVersion(observer)).toBe(beforeUnassignedNoop);
      expect(ownershipStore.find(1)).toEqual(unassigned);

      ownershipStore.updateOwner(1, "avery-stone");
      const assigned = ownershipStore.find(1) as OwnedTicket;
      const beforeAssignedNoop = dataVersion(observer);
      ownershipStore.updateOwner(1, "avery-stone");
      expect(dataVersion(observer)).toBe(beforeAssignedNoop);
      expect(ownershipStore.find(1)).toEqual(assigned);
    } finally {
      if (observer) observer.close();
      if (ticketStore && openStores.includes(ticketStore)) closeTestStore(ticketStore);
    }
  });

  it("combines exact owner result sets with existing queue filters", () => {
    const ownershipStore = requireOwnershipStore(createTestStore(":memory:", true));
    ownershipStore.updateOwner(1, "avery-stone");
    ownershipStore.updateOwner(2, "jordan-lee");
    ownershipStore.updateOwner(3, "avery-stone");
    const references = (filters: Parameters<OwnershipStore["list"]>[0]) =>
      ownershipStore.list(filters).map((ticket) => ticket.reference).sort();

    expect(references({})).toEqual(["INC-0001", "INC-0002", "INC-0003", "INC-0004"]);
    expect(references({ owner: "avery-stone" })).toEqual(["INC-0001", "INC-0003"]);
    expect(references({ owner: "jordan-lee" })).toEqual(["INC-0002"]);
    expect(references({ owner: "unassigned" })).toEqual(["INC-0004"]);
    expect(references({
      owner: "avery-stone",
      status: "open",
      priority: "high",
      query: "inc-1",
    })).toEqual(["INC-0001"]);
    expect(references({ owner: "avery-stone", priority: "critical" })).toEqual([]);
    expect(ownershipStore.summary()).toEqual({ open: 2, inProgress: 1, resolved: 1, urgent: 2 });
  });

  it("rejects invalid ownership requests without mutating any ticket", () => {
    const ownershipStore = requireOwnershipStore(createTestStore(":memory:", true));
    const before = ownershipStore.list();

    expect(() => ownershipStore.updateOwner(1, "forged-owner" as TicketOwner)).toThrow(/invalid.*owner/i);
    expect(ownershipStore.list()).toEqual(before);
    expect(() => ownershipStore.updateOwner(999, "avery-stone")).toThrow(/not found/i);
    expect(ownershipStore.list()).toEqual(before);
  });

  it("keeps creation unassigned and preserves ownership during status updates", () => {
    const ownershipStore = requireOwnershipStore(createTestStore());
    const input: CreateTicketInput = {
      title: "Cannot reset my password",
      description: "The password reset link reports that it has expired.",
      category: "Access and identity",
      priority: "high",
      requesterName: "Jordan Lee",
      requesterEmail: "jordan.lee@example.com",
    };
    const created = ownershipStore.create({
      ...input,
      owner: "avery-stone",
    } as CreateTicketInput) as OwnedTicket;
    const jordan = ownershipStore.create(input) as OwnedTicket;
    const unassigned = ownershipStore.create(input) as OwnedTicket;

    expect(created.owner).toBeNull();
    ownershipStore.updateOwner(created.id, "avery-stone");
    ownershipStore.updateOwner(jordan.id, "jordan-lee");
    for (const [ticket, owner] of [
      [created, "avery-stone"],
      [jordan, "jordan-lee"],
      [unassigned, null],
    ] as const) {
      expect(ownershipStore.updateStatus(ticket.id, "resolved")).toBe(true);
      expect(ownershipStore.find(ticket.id)).toMatchObject({
        id: ticket.id,
        status: "resolved",
        owner,
      });
    }
  });
});
