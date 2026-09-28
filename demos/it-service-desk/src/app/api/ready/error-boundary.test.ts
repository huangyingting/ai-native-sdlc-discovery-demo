import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const getTicketStore = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ticket-store", () => ({ getTicketStore }));

beforeEach(() => {
  getTicketStore.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readiness error boundary", () => {
  it.each(["initialization", "summary"] as const)(
    "handles a frozen %s error without mutating it",
    async (stage) => {
      const error = Object.freeze(new Error("private storage failure"));
      const before = Object.getOwnPropertyDescriptors(error);
      const fail = () => {
        throw error;
      };
      if (stage === "initialization") {
        getTicketStore.mockImplementation(fail);
      } else {
        getTicketStore.mockReturnValue({ summary: fail });
      }
      const log = vi.spyOn(console, "error").mockImplementation(() => {});

      const response = GET();

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ status: "unavailable" });
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(log.mock.calls).toEqual([["Service desk readiness check failed"]]);
      expect(Object.getOwnPropertyDescriptors(error)).toEqual(before);
    },
  );
});
