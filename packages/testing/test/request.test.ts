/**
 * GH-074 request-builder and cookie-jar coverage: form/JSON/multipart
 * bodies, file fixtures, dialect-correct enhanced headers (htmx 4 beta
 * aliases the trigger header), and jar semantics (last-write-wins,
 * clearing, replay header).
 */
import { describe, expect, test } from "bun:test";
import {
  getHtmxTarget,
  getHtmxTrigger,
  isBoostedRequest,
  isHtmxRequest,
} from "@bundar/htmx";
import { htmx2 } from "@bundar/htmx/2";
import { htmx4Experimental } from "@bundar/htmx/4";
import {
  CookieJar,
  enhancedRequest,
  fileFixture,
  formRequest,
  jsonRequest,
  multipartRequest,
  responseCookies,
} from "../src/index";

describe("GH-074 request builders", () => {
  test("formRequest builds a urlencoded POST", async () => {
    const request = formRequest("/login", { user: "nina", pin: "1 2" });
    expect(request.method).toBe("POST");
    expect(request.headers.get("content-type")).toBe(
      "application/x-www-form-urlencoded",
    );
    expect(await request.text()).toBe("user=nina&pin=1+2");
  });

  test("jsonRequest serializes the body", async () => {
    const request = jsonRequest("/api", { a: 1 });
    expect(request.headers.get("content-type")).toBe("application/json");
    expect(JSON.parse(await request.text())).toEqual({ a: 1 });
  });

  test("multipartRequest carries fields and file fixtures", async () => {
    const request = multipartRequest("/upload", {
      note: "hello",
      doc: fileFixture("PDF-ish", "a.pdf", "application/pdf"),
    });
    const contentType = request.headers.get("content-type") ?? "";
    expect(contentType.startsWith("multipart/form-data; boundary=")).toBe(true);
    const form = await request.formData();
    expect(form.get("note")).toBe("hello");
    const file = form.get("doc");
    expect(file).toBeInstanceOf(File);
    expect((file as File).name).toBe("a.pdf");
    expect((file as File).type).toBe("application/pdf");
  });

  test("enhancedRequest applies neutral canonical headers by default", () => {
    const request = enhancedRequest("/items", {
      method: "GET",
      htmx: { target: "#list", trigger: "add-btn" },
    });
    // asserted through neutral readers — no raw protocol strings here
    expect(isHtmxRequest(request)).toBe(true);
    expect(getHtmxTarget(request)).toBe("#list");
    expect(getHtmxTrigger(request)).toBe("add-btn");
    expect(isBoostedRequest(request)).toBe(false);
  });

  test("enhancedRequest aliases the trigger for htmx 4 beta", () => {
    const request = enhancedRequest("/items", {
      method: "GET",
      dialect: htmx4Experimental,
      htmx: { trigger: "add-btn", boosted: true },
    });
    // decoded by the adapter the way a v4 app would see the request
    const metadata = htmx4Experimental.decodeRequest(request);
    expect(metadata.sourceElement.status).toBe("present");
    expect(metadata.sourceElement.value).toBe("add-btn");
    expect(metadata.boosted).toBe(true);
    expect(getHtmxTrigger(request)).toBeNull();
  });

  test("enhancedRequest keeps canonical names for htmx 2", () => {
    const request = enhancedRequest("/items", {
      method: "GET",
      dialect: htmx2,
      htmx: { trigger: "add-btn" },
    });
    const metadata = htmx2.decodeRequest(request);
    expect(metadata.sourceElement.status).toBe("present");
    expect(metadata.sourceElement.value).toBe("add-btn");
  });
});

describe("GH-074 CookieJar", () => {
  test("absorbs Set-Cookie and replays one cookie header", () => {
    const response = new Response("ok", {
      headers: { "set-cookie": "a=1; Path=/; HttpOnly" },
    });
    const jar = new CookieJar().absorb(response);
    expect(jar.get("a")).toBe("1");
    expect(jar.header()).toBe("a=1");
  });

  test("later assignments win; empty values clear", () => {
    const jar = new CookieJar()
      .absorb(new Response(null, { headers: { "set-cookie": "t=first" } }))
      .absorb(new Response(null, { headers: { "set-cookie": "t=second" } }));
    expect(jar.get("t")).toBe("second");
    jar.absorb(new Response(null, { headers: { "set-cookie": "t=" } }));
    expect(jar.get("t")).toBeUndefined();
  });

  test("clear empties the jar for isolation", () => {
    const jar = new CookieJar().set("sid", "x");
    jar.clear();
    expect(jar.size).toBe(0);
    expect(jar.header()).toBe("");
  });

  test("responseCookies parses without jar state", () => {
    const response = new Response(null);
    const headers = new Headers();
    headers.append("set-cookie", "one=1");
    headers.append("set-cookie", "two=2");
    Object.defineProperty(response, "headers", { value: headers });
    expect(responseCookies(response)).toEqual(
      new Map([
        ["one", "1"],
        ["two", "2"],
      ]),
    );
  });
});
