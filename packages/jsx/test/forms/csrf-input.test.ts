/**
 * GH-061 CSRF hidden input: renders the token as a hidden field with the
 * conventional name, and escapes attribute values.
 */
import { describe, expect, test } from "bun:test";
import { CsrfInput } from "../../src/index";
import { renderToString } from "../../src/index";

describe("GH-061 CsrfInput", () => {
  test("renders a hidden input with the conventional field name", () => {
    // attributes render in sorted order; assert each independently
    const html = renderToString(CsrfInput({ token: "1234567890.abcdef.hmac" }));
    expect(html).toContain("<input");
    expect(html).toContain('type="hidden"');
    expect(html).toContain('name="_csrf"');
    expect(html).toContain('value="1234567890.abcdef.hmac"');
    expect(html).toContain('autocomplete="off"');
  });

  test("the field name is configurable but defaults safely", () => {
    const html = renderToString(CsrfInput({ token: "t", name: "csrf_token" }));
    expect(html).toContain('name="csrf_token"');
  });

  test("token values are escaped as attributes", () => {
    const html = renderToString(CsrfInput({ token: 'a"b"><script>' }));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&quot;");
  });
});
