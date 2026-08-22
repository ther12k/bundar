/**
 * GH-051 update intent tests: identical source across dialects, explicit
 * target ids, preserved swap semantics, validation diagnostics (duplicate
 * targets, missing content, remove-with-content), unsupported-mode
 * rejection, and the raw-mechanism audit.
 */
import { describe, expect, test } from "bun:test";
import { jsx } from "@bundar/jsx";
import {
  auditUpdateMechanisms,
  serializeUpdates,
  UpdateIntentError,
} from "../../src/index";
import { htmx2 } from "../../src/dialects/v2/index";
import { htmx4Experimental } from "../../src/dialects/v4/index";

const counterRow = (n: number) =>
  jsx("span", { id: "counter", children: `${n} items` });

const intents = (n: number) => [
  {
    target: { id: "counter" },
    operation: { kind: "replace-element" } as const,
    content: counterRow(n),
  },
  {
    target: { id: "todo-list" },
    operation: { kind: "append" } as const,
    content: jsx("li", { children: `item ${n}` }),
  },
];

describe("GH-051 identical source, both dialects", () => {
  test("the same intents serialize for htmx 2 and the htmx 4 beta", () => {
    const v2 = serializeUpdates(intents(3), htmx2);
    const v4 = serializeUpdates(intents(3), htmx4Experimental);
    expect(v2.html).toBe(v4.html);
    expect(v2.html).toContain('id="counter"');
    expect(v2.html).toContain("3 items");
    expect(v2.html).toContain('id="todo-list"');
    expect(v2.html).toContain("item 3");
  });

  test("every operation maps to its explicit OOB swap value", () => {
    const { html } = serializeUpdates(
      [
        {
          target: { id: "a" },
          operation: { kind: "replace-content" },
          content: jsx("p", { children: "A" }),
        },
        {
          target: { id: "b" },
          operation: { kind: "replace-element" },
          content: jsx("p", { children: "B" }),
        },
        {
          target: { id: "c" },
          operation: { kind: "append" },
          content: jsx("p", { children: "C" }),
        },
        {
          target: { id: "d" },
          operation: { kind: "prepend" },
          content: jsx("p", { children: "D" }),
        },
        { target: { id: "e" }, operation: { kind: "remove" } },
      ],
      htmx2,
    );
    expect(html).toContain('hx-swap-oob="true" id="a"');
    expect(html).toContain('hx-swap-oob="outerHTML" id="b"');
    expect(html).toContain('hx-swap-oob="beforeend" id="c"');
    expect(html).toContain('hx-swap-oob="afterbegin" id="d"');
    expect(html).toContain('hx-swap-oob="delete" id="e"');
    expect(html).not.toContain("<script");
  });

  test("prebuilt string content rides the raw boundary verbatim", () => {
    const { html } = serializeUpdates(
      [
        {
          target: { id: "x" },
          operation: { kind: "replace-content" },
          content: "<strong>ok</strong>",
        },
      ],
      htmx2,
    );
    expect(html).toContain("<strong>ok</strong>");
  });
});

describe("GH-051 validation diagnostics", () => {
  test("duplicate targets are rejected, not merged", () => {
    expect(() =>
      serializeUpdates(
        [
          {
            target: { id: "same" },
            operation: { kind: "replace-content" },
            content: "a",
          },
          {
            target: { id: "same" },
            operation: { kind: "append" },
            content: "b",
          },
        ],
        htmx2,
      ),
    ).toThrow(UpdateIntentError);
  });

  test("missing content and remove-with-content are rejected", () => {
    expect(() =>
      serializeUpdates(
        [{ target: { id: "a" }, operation: { kind: "append" } }],
        htmx2,
      ),
    ).toThrow(UpdateIntentError);
    expect(() =>
      serializeUpdates(
        [{ target: { id: "a" }, operation: { kind: "remove" }, content: "x" }],
        htmx2,
      ),
    ).toThrow(UpdateIntentError);
  });

  test("empty intent lists and blank ids are rejected", () => {
    expect(() => serializeUpdates([], htmx2)).toThrow(UpdateIntentError);
    expect(() =>
      serializeUpdates(
        [{ target: { id: "" }, operation: { kind: "remove" } }],
        htmx2,
      ),
    ).toThrow(UpdateIntentError);
  });

  test("dialects without the capability fail closed with a diagnostic", () => {
    const incapable = {
      ...htmx2,
      id: "incapable",
      capabilities: {
        ...htmx2.capabilities,
        "out-of-band-swaps": "unsupported" as const,
      },
    };
    expect(() => serializeUpdates(intents(1), incapable as never)).toThrow(
      /does not support out-of-band swaps/,
    );
  });
});

describe("GH-051 compatibility audit", () => {
  test("raw mechanisms are reported per target for audits", () => {
    const serialized = serializeUpdates(intents(2), htmx2);
    const audit = auditUpdateMechanisms(serialized);
    expect(audit).toHaveLength(2);
    expect(audit[0]).toContain("counter: hx-swap-oob:outerHTML");
    expect(audit.join(" ")).toContain("native");
  });

  test("the htmx 4 beta's diagnostics carry the dialect identity", () => {
    const { diagnostics } = serializeUpdates(intents(1), htmx4Experimental);
    // note text distinguishes native vs annotated support by maturity
    expect(diagnostics[0]!.support).toBe("native");
    expect(diagnostics[0]!.mechanism).toContain("hx-swap-oob");
  });
});
