import { revalidatePath } from "next/cache";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getTicketStore } from "@/lib/ticket-store";
import * as actions from "./actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/ticket-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ticket-store")>();
  const store = new actual.TicketStore(":memory:", true);
  return { ...actual, getTicketStore: () => store };
});

afterAll(() => getTicketStore().close());
beforeEach(() => vi.clearAllMocks());

function ownerAction() {
  return (
    actions as typeof actions & {
      updateTicketOwnerAction?: (formData: FormData) => Promise<unknown>;
    }
  ).updateTicketOwnerAction;
}

function ownershipForm(owner: string) {
  const formData = new FormData();
  formData.set("id", "1");
  formData.set("owner", owner);
  return formData;
}

describe("ownership action", () => {
  it("rejects forged owners and missing tickets without mutating any row", async () => {
    const updateTicketOwnerAction = ownerAction();
    expect(typeof updateTicketOwnerAction).toBe("function");
    if (!updateTicketOwnerAction) return;

    const before = getTicketStore().list();
    const forged = new FormData();
    forged.set("id", "1");
    forged.set("owner", "forged-owner");
    await expect(updateTicketOwnerAction(forged)).rejects.toThrow(/invalid.*owner/i);
    expect(getTicketStore().list()).toEqual(before);

    const missing = new FormData();
    missing.set("id", "999");
    missing.set("owner", "avery-stone");
    await expect(updateTicketOwnerAction(missing)).rejects.toThrow(/not found/i);
    expect(getTicketStore().list()).toEqual(before);
  });

  it("assigns, reassigns, and clears ownership while revalidating queue and detail", async () => {
    const updateTicketOwnerAction = ownerAction();
    expect(typeof updateTicketOwnerAction).toBe("function");
    if (!updateTicketOwnerAction) return;

    for (const [owner, storedOwner] of [
      ["avery-stone", "avery-stone"],
      ["jordan-lee", "jordan-lee"],
      ["", null],
    ] as const) {
      await updateTicketOwnerAction(ownershipForm(owner));
      expect(getTicketStore().find(1)).toMatchObject({ owner: storedOwner });
    }
    expect(vi.mocked(revalidatePath).mock.calls).toEqual([
      ["/"],
      ["/tickets/1"],
      ["/"],
      ["/tickets/1"],
      ["/"],
      ["/tickets/1"],
    ]);
  });
});
