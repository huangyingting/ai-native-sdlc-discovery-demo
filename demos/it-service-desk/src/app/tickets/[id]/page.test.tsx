// @vitest-environment jsdom

import { Children, isValidElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import { CustomSelect } from "@/app/custom-select";
import { TicketForm } from "@/app/ticket-form";
import { getTicketStore } from "@/lib/ticket-store";
import TicketPage from "./page";

vi.mock("@/lib/ticket-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ticket-store")>();
  const store = new actual.TicketStore(":memory:", true);
  return { ...actual, getTicketStore: () => store };
});

afterAll(() => getTicketStore().close());

function findCustomSelects(node: ReactNode): ComponentProps<typeof CustomSelect>[] {
  const matches: ComponentProps<typeof CustomSelect>[] = [];
  if (!isValidElement(node)) return matches;
  if (node.type === CustomSelect) matches.push(node.props as ComponentProps<typeof CustomSelect>);
  const { children } = node.props as { children?: ReactNode };
  Children.forEach(children, (child) => matches.push(...findCustomSelects(child)));
  return matches;
}

describe("Ticket detail and creation", () => {
  it("renders assigned and unassigned owner metadata with an accessible handoff while keeping intake ownerless", async () => {
    const ownershipStore = getTicketStore() as ReturnType<typeof getTicketStore> & {
      updateOwner?: (id: number, owner: "avery-stone" | "jordan-lee" | "") => unknown;
    };
    expect(typeof ownershipStore.updateOwner).toBe("function");
    if (!ownershipStore.updateOwner) return;
    ownershipStore.updateOwner(1, "avery-stone");

    const element = await TicketPage({ params: Promise.resolve({ id: "1" }) });
    const ownerSelect = findCustomSelects(element).find((select) => select.name === "owner");
    expect(ownerSelect).toBeDefined();
    expect(ownerSelect).toMatchObject({
      defaultValue: "avery-stone",
      id: "owner",
      options: [
        { value: "", label: "Unassigned" },
        { value: "avery-stone", label: "Avery Stone" },
        { value: "jordan-lee", label: "Jordan Lee" },
      ],
    });

    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(element);
    const trigger = container.querySelector<HTMLButtonElement>("#owner")!;
    expect(trigger.labels?.[0].textContent).toMatch(/owner/i);
    expect(container.querySelector(`#${trigger.getAttribute("aria-describedby")}`)?.textContent).toBe("Avery Stone");
    const assignedOwner = [...container.querySelectorAll(".detail-list div")]
      .find((entry) => entry.querySelector("dt")?.textContent === "Owner");
    expect(assignedOwner?.querySelector("dd")?.textContent).toBe("Avery Stone");

    const unassigned = document.createElement("div");
    unassigned.innerHTML = renderToStaticMarkup(
      await TicketPage({ params: Promise.resolve({ id: "4" }) }),
    );
    const unassignedOwner = [...unassigned.querySelectorAll(".detail-list div")]
      .find((entry) => entry.querySelector("dt")?.textContent === "Owner");
    expect(unassignedOwner?.querySelector("dd")?.textContent).toBe("Unassigned");

    const creation = document.createElement("div");
    creation.innerHTML = renderToStaticMarkup(<TicketForm />);
    expect(creation.querySelector('[name="owner"]')).toBeNull();
  });
});
