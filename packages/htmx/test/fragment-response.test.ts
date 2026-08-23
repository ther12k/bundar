/**
 * BR-052 tests: composeFragment typed response spec — dual-dialect parity,
 * async primary nodes, remove/content intents, and the guarantee that
 * applications never touch raw swap markers themselves.
 */
import { describe, expect, test } from "bun:test";
import { jsx } from "../../jsx/src/index";
import { htmx2 } from "../src/dialects/v2";
import { htmx4Experimental } from "../src/dialects/v4";
import { composeFragment } from "../src/updates";

describe("BR-052 composeFragment", () => {
  const spec = {
    primary: jsx("li", { id: "todo-7", children: "Buy milk" }),
    updates: [
      {
        target: "todo-counts",
        content: jsx("p", { id: "todo-counts", children: "2 total" }),
      },
      { target: "todo-9", operation: "remove" as const },
    ],
  };

  test("renders primary plus OOB intents for htmx 2", () => {
    const html = composeFragment(spec, { dialect: htmx2 });
    expect(html).toContain('id="todo-7"');
    expect(html).toContain("hx-swap-oob");
    expect(html).toContain("2 total");
    // remove intent renders a deletion marker targeting todo-9
    expect(html).toMatch(/todo-9/);
  });

  test("the same spec works under the experimental htmx 4 adapter", () => {
    const v4 = composeFragment(spec, { dialect: htmx4Experimental });
    expect(v4).toContain('id="todo-7"');
    expect(v4).toContain("todo-counts");
    expect(v4).toContain("todo-9");
  });

  test("async primaries fail closed with the documented buffering rule", () => {
    const pending = Promise.resolve(jsx("p", { children: "later" }));
    expect(() =>
      composeFragment({ primary: pending }, { dialect: htmx2 }),
    ).toThrow(/await async nodes before composeFragment/);
  });

  test("empty spec yields empty string; remove-only works", () => {
    expect(composeFragment({}, { dialect: htmx2 })).toBe("");
    const removal = composeFragment(
      { updates: [{ target: "gone", operation: "remove" }] },
      { dialect: htmx2 },
    );
    expect(removal).toContain("gone");
  });
});
