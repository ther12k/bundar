/**
 * GH-059 accessible error summary rendering: anchors target fields, globals
 * render without links, empty models render nothing, and messages are
 * escaped.
 */
import { describe, expect, test } from "bun:test";
import { ErrorSummary, fieldAnchorId } from "../../src/index";
import { renderToString } from "../../src/index";

function errorsModel(options: {
  fields?: Record<string, string[]>;
  global?: string[];
}) {
  const fields = options.fields ?? {};
  const order = Object.keys(fields);
  return {
    order,
    global: options.global ?? [],
    field: (name: string) => fields[name] ?? [],
    first: order.map((field) => ({ field, message: fields[field]![0]! })),
    get empty() {
      return order.length === 0 && (options.global ?? []).length === 0;
    },
  };
}

describe("GH-059 ErrorSummary", () => {
  test("renders an accessible summary whose links target field anchors", () => {
    const html = renderToString(
      ErrorSummary({
        errors: errorsModel({
          fields: { name: ["too short", "letters only"], email: ["invalid"] },
        }),
      }),
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-labelledby="error-summary-title"');
    expect(html).toContain("There is a problem");
    expect(html).toContain('<a href="#name">too short</a>');
    expect(html).toContain('<a href="#email">invalid</a>');
    // first error per field only in the summary; details stay on the field
    expect(html).not.toContain("letters only");
  });

  test("nested field ids map to dash anchors with an optional prefix", () => {
    expect(fieldAnchorId("items.0.name")).toBe("items-0-name");
    expect(fieldAnchorId("billing.address", "form")).toBe(
      "form-billing-address",
    );
    const html = renderToString(
      ErrorSummary({
        errors: errorsModel({ fields: { "items.0.name": ["invalid"] } }),
        targetPrefix: "form",
      }),
    );
    expect(html).toContain('<a href="#form-items-0-name">invalid</a>');
  });

  test("global errors render as list items without links", () => {
    const html = renderToString(
      ErrorSummary({
        errors: errorsModel({
          fields: { name: ["required"] },
          global: ["form closed", "submission locked"],
        }),
      }),
    );
    expect(html).toContain("<li>form closed</li>");
    expect(html).toContain("<li>submission locked</li>");
  });

  test("an empty model renders nothing (omission contract)", () => {
    expect(renderToString(ErrorSummary({ errors: errorsModel({}) }))).toBe("");
  });

  test("messages are escaped — no markup injection from validators", () => {
    const html = renderToString(
      ErrorSummary({
        errors: errorsModel({
          fields: { name: ["<script>alert(1)</script>"] },
          global: ["<b>bold</b>"],
        }),
      }),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
  });

  test("custom ids and headings are honored", () => {
    const html = renderToString(
      ErrorSummary({
        errors: errorsModel({ global: ["nope"] }),
        id: "errors",
        heading: "Probleme im Formular",
      }),
    );
    expect(html).toContain('id="errors"');
    expect(html).toContain('aria-labelledby="errors-title"');
    expect(html).toContain("Probleme im Formular");
  });
});
