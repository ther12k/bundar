import { describe, expect, test } from "bun:test";
import { App } from "../../src/app";
import { createContext } from "../../src/context";
import {
  BodyConsumedError,
  BodyLimitError,
  DEFAULT_BODY_LIMITS,
  MalformedBodyError,
  parseForm,
  parseJson,
  parseText,
  UnsupportedMediaTypeError,
} from "../../src/request/body";

function formContext(body: string, type = "application/x-www-form-urlencoded") {
  return createContext(
    new Request("http://x/submit", {
      method: "POST",
      body,
      headers: { "content-type": type },
    }),
    {},
  );
}

describe("GH-057 urlencoded form parsing", () => {
  test("repeated fields retain order and multiplicity", async () => {
    const form = await parseForm(formContext("tag=a&tag=b&tag=c&name=Bundar"));
    expect(form.getAll("tag")).toEqual(["a", "b", "c"]);
    expect(form.fields.map((f) => f.name)).toEqual(["tag", "name"]);
    expect(form.get("name")).toBe("Bundar");
  });

  test("absent vs empty values are distinguished", async () => {
    const form = await parseForm(formContext("present=&filled=yes"));
    expect(form.has("present")).toBe(true);
    expect(form.get("present")).toBe("");
    expect(form.has("missing")).toBe(false);
    expect(form.get("missing")).toBeNull();
  });

  test("field-count limit fails before unbounded allocation", async () => {
    const many = Array.from({ length: 101 }, (_, i) => `f${i}=v`).join("&");
    await expect(parseForm(formContext(many))).rejects.toThrow(BodyLimitError);
    await expect(
      parseForm(formContext(many), { maxFields: 200 }),
    ).resolves.toBeTruthy();
  });

  test("field order within each repeated key is submission order", async () => {
    const form = await parseForm(formContext("z=1&a=2&z=3&a=4"));
    expect(form.getAll("z")).toEqual(["1", "3"]);
    expect(form.getAll("a")).toEqual(["2", "4"]);
    expect(form.fields.map((f) => f.name)).toEqual(["z", "a"]);
  });
});

describe("GH-057 multipart parsing", () => {
  test("fields and bounded files parse with sizes", async () => {
    const boundary = "----bundar";
    const body = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="title"`,
      "",
      "hello",
      `--${boundary}`,
      `Content-Disposition: form-data; name="upload"; filename="a.txt"`,
      "Content-Type: text/plain",
      "",
      "file-content",
      `--${boundary}--`,
    ].join("\r\n");
    const form = await parseForm(
      formContext(body, `multipart/form-data; boundary=${boundary}`),
    );
    expect(form.get("title")).toBe("hello");
    expect(form.files).toHaveLength(1);
    expect(form.files[0]?.filename).toBe("a.txt");
    expect(form.files[0]?.size).toBe("file-content".length);
    expect(new TextDecoder().decode(form.files[0]!.bytes)).toBe("file-content");
  });

  test("file-count limit fails closed", async () => {
    const boundary = "----bundar";
    const part = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="f${0}"; filename="x${0}"`,
      "",
      "data",
    ].join("\r\n");
    const body = `${part}\r\n${part.replace(/f0/g, "f1").replace(/x0/g, "x1")}\r\n--${boundary}--`;
    await expect(
      parseForm(
        formContext(body, `multipart/form-data; boundary=${boundary}`),
        {
          maxFiles: 1,
        },
      ),
    ).rejects.toThrow(BodyLimitError);
  });
});

describe("GH-057 size and timeout limits", () => {
  test("oversized Content-Length fails before reading the body", async () => {
    const request = new Request("http://x/", {
      method: "POST",
      headers: {
        "content-type": "text/plain",
        "content-length": String(DEFAULT_BODY_LIMITS.maxBytes + 1),
      },
    });
    await expect(parseText(createContext(request, {}))).rejects.toThrow(
      BodyLimitError,
    );
  });

  test("streamed oversize fails mid-stream without unbounded allocation", async () => {
    // no content-length: the reader path must enforce maxBytes
    const big = "x".repeat(DEFAULT_BODY_LIMITS.maxBytes + 10);
    const context = createContext(
      new Request("http://x/", {
        method: "POST",
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(big));
            controller.close();
          },
        }),
        headers: { "content-type": "text/plain" },
      }),
      {},
    );
    await expect(parseText(context, { maxBytes: 1024 })).rejects.toThrow(
      BodyLimitError,
    );
  });
});

describe("GH-057 JSON parsing", () => {
  test("valid JSON parses; malformed produces controlled 400-class error", async () => {
    const ok = await parseJson<{ a: number }>(
      createContext(
        new Request("http://x/", {
          method: "POST",
          body: '{"a":1}',
          headers: { "content-type": "application/json" },
        }),
        {},
      ),
    );
    expect(ok.a).toBe(1);

    await expect(
      parseJson(
        createContext(
          new Request("http://x/", {
            method: "POST",
            body: "{invalid",
            headers: { "content-type": "application/json" },
          }),
          {},
        ),
      ),
    ).rejects.toThrow(MalformedBodyError);
  });

  test("deeply nested JSON is rejected by the nesting limit", async () => {
    const open = "[".repeat(20);
    const close = "]".repeat(20);
    const deep = `{"a":${open}${close}}`; // balanced: 20 array levels + root
    await expect(
      parseJson(
        createContext(
          new Request("http://x/", {
            method: "POST",
            body: deep,
            headers: { "content-type": "application/json" },
          }),
          {},
        ),
      ),
    ).rejects.toThrow(BodyLimitError);
    // the same shape under a deeper limit parses fine
    await expect(
      parseJson(
        createContext(
          new Request("http://x/", {
            method: "POST",
            body: deep,
            headers: { "content-type": "application/json" },
          }),
          {},
        ),
        { maxNestingDepth: 32 },
      ),
    ).resolves.toBeTruthy();
  });
});

describe("GH-057 media types and consumption", () => {
  test("unsupported media types produce controlled 4xx errors", async () => {
    await expect(
      parseForm(formContext("x", "application/octet-stream")),
    ).rejects.toThrow(UnsupportedMediaTypeError);
    await expect(
      parseText(formContext("x", "application/json")),
    ).rejects.toThrow(UnsupportedMediaTypeError);
    expect(new UnsupportedMediaTypeError("weird/thing").status).toBe(415);
  });

  test("single-consumption: second read fails deterministically", async () => {
    const context = formContext("a=1");
    await parseForm(context);
    await expect(parseForm(context)).rejects.toThrow(BodyConsumedError);
    await expect(parseText(context)).rejects.toThrow(BodyConsumedError);
  });

  test("body parsing does not run on routes that do not request it", async () => {
    const app = new App();
    app.post("/passthrough", (context) => {
      // never touches body APIs — body remains unconsumed
      return new Response(context.request.bodyUsed ? "consumed" : "intact");
    });
    const server = app.serve({ port: 0 });
    try {
      const response = await fetch(
        `http://localhost:${server.port}/passthrough`,
        {
          method: "POST",
          body: "payload=a",
          headers: { "content-type": "application/x-www-form-urlencoded" },
        },
      );
      expect(await response.text()).toBe("intact");
    } finally {
      server.stop(true);
    }
  });
});
