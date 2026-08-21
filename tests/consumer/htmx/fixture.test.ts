import { describe, expect, test } from "bun:test";
import { isHtmxRequest } from "@bundar/htmx";
import { htmx2 } from "@bundar/htmx/2";
import { htmx4Experimental } from "@bundar/htmx/4";

describe("HTMX consumer fixture", () => {
  test("imports neutral and versioned paths independently", () => {
    const req = new Request("http://localhost", {
      headers: { "HX-Request": "true" },
    });
    expect(isHtmxRequest(req)).toBe(true);
    expect(htmx2.version).toBe("htmx2");
    expect(htmx4Experimental.version).toBe("htmx4");
    expect(htmx4Experimental.experimental).toBe(true);
  });
});
