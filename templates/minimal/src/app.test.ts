/** Starter tests: both browser modes + validation from ONE client fixture. */
import { describe, expect, test } from "bun:test";
import { createTestClient } from "@bundar/testing";
import { createApp } from "./app";
import { dialect } from "./dialect";
import { urls } from "./routes.gen";

const client = createTestClient(createApp(), { dialect });

describe("minimal starter", () => {
  test("health endpoint answers", async () => {
    const response = await client.get(urls.health());
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });

  test("home renders a document with the form", async () => {
    const html = await (await client.get(urls.home())).text();
    expect(html).toContain("<html");
    expect(html).toContain('id="subscribe-form"');
  });

  test("form works WITHOUT JavaScript: PRG on valid, 422 + error region on invalid", async () => {
    const invalid = await client.submitForm(urls.subscribe(), {
      email: "nope",
    });
    expect(invalid.status).toBe(422);
    expect(await invalid.text()).toContain("Enter a valid email address");

    const valid = await client.submitForm(urls.subscribe(), {
      email: "No-JS@Example.com",
    });
    expect(valid.status).toBe(303);
    expect(valid.headers.get("location")).toBe("/");
  });

  test("enhanced (htmx) submit receives a fragment", async () => {
    const response = await client.enhancedSubmitForm(
      urls.subscribe(),
      { email: "htmx@example.com" },
      { target: "#subscribe-form" },
    );
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Subscribed: htmx@example.com");
    expect(body).not.toContain("<html");
  });

  test("the local htmx asset serves (no CDN)", async () => {
    const response = await client.get("/assets/htmx.js");
    expect(response.status).toBe(200);
  });
});
