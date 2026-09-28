import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
import { TicketStore } from "./ticket-store";

it("migrates an existing database only once and normalizes null ownership without writing", () => {
  const directory = mkdtempSync(join(tmpdir(), "ticket-owner-"));
  const filename = join(directory, "tickets.db");
  try {
    const legacy = new DatabaseSync(filename);
    legacy.exec(`CREATE TABLE tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      requester_email TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
    legacy.close();

    const first = new TicketStore(filename, true);
    const ticket = first.find(1)!;
    first.close();
    const second = new TicketStore(filename, true);
    const observer = new DatabaseSync(filename);
    try {
      expect(observer.prepare("PRAGMA table_info(tickets)").all()
        .filter((column) => column.name === "owner")).toHaveLength(1);
      const version = observer.prepare("PRAGMA data_version");
      const before = version.get();
      second.updateOwner(ticket.id, null);
      expect(second.find(ticket.id)).toEqual(ticket);
      expect(version.get()).toEqual(before);
      expect(() => second.updateOwner(0, "avery-stone")).toThrow(/not found/i);
      expect(second.find(ticket.id)).toEqual(ticket);
    } finally {
      observer.close();
      second.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
