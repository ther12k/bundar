import { describe, expect, test } from "bun:test";
import { normalizeHtmxRequest } from "../../src/request";

describe("GH-041 normalized request metadata", () => {
  test("decodes a standard htmx request", () => {
    const request = new Request("http://app/items", {
      headers: {
        "HX-Request": "true",
        "HX-Trigger": "btn-refresh",
        "HX-Target": "#list",
        "HX-Current-URL": "http://app/page",
      },
    });
    const meta = normalizeHtmxRequest(request);

    expect(meta.isHtmx).toBe(true);
    expect(meta.kind).toBe("standard");
    expect(meta.representation).toBe("fragment");
    expect(meta.sourceElement).toEqual({
      status: "present",
      value: "btn-refresh",
      trust: "untrusted",
    });
    expect(meta.target.value).toBe("#list");
    expect(meta.currentUrl.value?.href).toBe("http://app/page");
    expect(meta.boosted).toBe(false);
  });

  test("boosted and history-restore requests classify distinctly", () => {
    const boosted = normalizeHtmxRequest(
      new Request("http://app/x", {
        headers: { "HX-Request": "true", "HX-Boosted": "true" },
      }),
    );
    expect(boosted.kind).toBe("boosted");

    const restore = normalizeHtmxRequest(
      new Request("http://app/x", {
        headers: { "HX-History-Restore-Request": "true" },
      }),
    );
    expect(restore.kind).toBe("history-restore");
    expect(restore.historyRestore).toBe(true);
  });

  test("non-htmx requests degrade to page representation", () => {
    const meta = normalizeHtmxRequest(new Request("http://app/page"));
    expect(meta.isHtmx).toBe(false);
    expect(meta.kind).toBe("standard");
    expect(meta.representation).toBe("page");
    expect(meta.sourceElement.status).toBe("absent");
    expect(meta.target.status).toBe("absent");
    expect(meta.currentUrl.status).toBe("absent");
    expect(meta.prompt.status).toBe("absent");
  });

  test("absent, malformed, and unsupported are distinguishable", () => {
    const meta = normalizeHtmxRequest(
      new Request("http://app/x", {
        headers: {
          "HX-Request": "true",
          "HX-Target": "not a valid!!! selector{{",
          "HX-Current-URL": "not-a-url",
        },
      }),
    );
    expect(meta.target.status).toBe("malformed");
    expect(meta.target.value).toBeNull();
    expect(meta.currentUrl.status).toBe("malformed");
    expect(meta.currentUrl.value).toBeNull();
    // prompt simply absent
    expect(meta.prompt.status).toBe("absent");
  });

  test("header parsing is case-insensitive and deterministic", () => {
    const build = () =>
      normalizeHtmxRequest(
        new Request("http://app/x", {
          headers: {
            "hx-request": "true",
            "Hx-Trigger": "case-test",
            "hx-target": "#ok",
          },
        }),
      );
    const first = build();
    const second = build();
    expect(first.sourceElement.value).toBe("case-test");
    expect(first.target.value).toBe("#ok");
    // every data field identical across runs (raw is a diagnostic function)
    const { raw: rawA, ...dataA } = first;
    const { raw: rawB, ...dataB } = second;
    expect(dataA).toEqual(dataB);
    expect(rawA.__diagnosticOnly).toBe(true);
    expect(rawB.__diagnosticOnly).toBe(true);
  });

  test("version aliasing: v4 HX-Source maps onto sourceElement", () => {
    const meta = normalizeHtmxRequest(
      new Request("http://app/x", { headers: { "HX-Source": "nav-link" } }),
      { headerAliases: { "HX-Trigger": "HX-Source" } },
    );
    expect(meta.sourceElement.value).toBe("nav-link");
    // consumers never branch on v2/v4 header names
  });

  test("client values are always marked untrusted", () => {
    const meta = normalizeHtmxRequest(
      new Request("http://app/x", {
        headers: {
          "HX-Request": "true",
          "HX-Target": "#t",
          "HX-Current-URL": "https://evil.example/path",
        },
      }),
    );
    expect(meta.target.trust).toBe("untrusted");
    expect(meta.currentUrl.trust).toBe("untrusted");
    expect(meta.sourceElement.trust).toBe("untrusted");
    // the URL parses as data; nothing promotes it to a redirect destination
    expect(meta.currentUrl.value?.hostname).toBe("evil.example");
  });

  test("CRLF/control characters cannot enter header values", () => {
    // The Headers API itself rejects CR/LF and NUL at construction — the
    // platform guard fires before any Bundar parsing. The parser retains a
    // defense-in-depth control-character check as the second layer.
    expect(
      () =>
        new Request("http://app/x", {
          headers: { "HX-Trigger": "btn\r\nSet-Cookie: pwned=1" },
        }),
    ).toThrow();
    expect(
      () =>
        new Request("http://app/x", {
          headers: { ["HX-Trigger"]: "btn\u0000injected" },
        }),
    ).toThrow();
  });

  test("raw headers are reachable only through the diagnostic accessor", () => {
    const request = new Request("http://app/x", {
      headers: {
        "HX-Request": "true",
        "HX-Target": "#list",
        "Content-Type": "text/plain",
      },
    });
    const meta = normalizeHtmxRequest(request);
    const raw = meta.raw();
    expect(Object.keys(raw).sort()).toEqual(["hx-request", "hx-target"]);
    expect(raw["hx-target"]).toBe("#list");
    expect(meta.raw.__diagnosticOnly).toBe(true);
  });
});
