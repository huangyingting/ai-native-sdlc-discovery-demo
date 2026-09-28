// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { Children, isValidElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import { getTicketStore } from "@/lib/ticket-store";
import { CustomSelect } from "./custom-select";
import Dashboard from "./page";

vi.mock("@/lib/ticket-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ticket-store")>();
  const store = new actual.TicketStore(":memory:", false);
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

describe("Dashboard", () => {
  it("renders the stable smoke identifier without relying on heading copy", async () => {
    const html = renderToStaticMarkup(await Dashboard({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('<main data-testid="service-desk-dashboard">');
  });

  it.each([0, 1])("does not clip filter menus when the queue has %i tickets", async (count) => {
    if (count) {
      getTicketStore().create({
        title: "Laptop display flickers",
        description: "The display flickers when connected to a dock.",
        category: "Device and hardware",
        priority: "high",
        requesterName: "Sam Rivera",
        requesterEmail: "sam.rivera@example.com",
      });
    }
    const html = renderToStaticMarkup(await Dashboard({ searchParams: Promise.resolve({}) }));
    const style = document.createElement("style");
    style.textContent = readFileSync("src/app/globals.css", "utf8");
    document.head.append(style);
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    try {
      expect(container.querySelectorAll(".ticket-row")).toHaveLength(count);
      expect(getComputedStyle(container.querySelector(".queue")!).overflow).toBe("visible");
      expect(getComputedStyle(container.querySelector(".ticket-list")!).overflowX).toBe("auto");
    } finally {
      container.remove();
      style.remove();
    }
  });

  it("renders synchronized accessible owner filtering and unfiltered summary cards", async () => {
    const element = await Dashboard({
      searchParams: Promise.resolve({
        owner: "avery-stone",
        q: "inc-1",
        status: "open",
        priority: "high",
      }),
    });
    const ownerSelect = findCustomSelects(element).find((select) => select.name === "owner");
    expect(ownerSelect).toBeDefined();
    expect(ownerSelect).toMatchObject({
      defaultValue: "avery-stone",
      id: "owner",
      options: [
        { value: "", label: "All owners" },
        { value: "unassigned", label: "Unassigned" },
        { value: "avery-stone", label: "Avery Stone" },
        { value: "jordan-lee", label: "Jordan Lee" },
      ],
    });

    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(element);
    const trigger = container.querySelector<HTMLButtonElement>("#owner")!;
    expect(trigger.labels?.[0].textContent).toBe("Owner");
    expect(container.querySelector(`#${trigger.getAttribute("aria-describedby")}`)?.textContent).toBe("Avery Stone");
    const form = container.querySelector<HTMLFormElement>(".filters")!;
    expect(Object.fromEntries(new FormData(form))).toMatchObject({
      owner: "avery-stone",
      priority: "high",
      q: "inc-1",
      status: "open",
    });
    expect([...container.querySelectorAll(".metric strong")].map((node) => Number(node.textContent))).toEqual(
      Object.values(getTicketStore().summary()),
    );

    const restored = await Dashboard({
      searchParams: Promise.resolve({ owner: "jordan-lee" }),
    });
    expect(findCustomSelects(restored).find((select) => select.name === "owner")?.defaultValue).toBe("jordan-lee");
  });
});
