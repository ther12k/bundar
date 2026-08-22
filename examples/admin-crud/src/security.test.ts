/**
 * GH-077 security posture suite (`security:example-admin`): the
 * authorization and trust properties that make the admin fixture safe —
 * direct-URL parity with enhanced requests, HTMX metadata never trusted
 * for authorization or identity, CSRF fail-closed on every mutation, and
 * no internals leakage on any error path.
 */
import { describe, expect, test } from "bun:test";
import { ErrorBoundary } from "@bundar/core";
import { createTestClient } from "@bundar/testing";
import { htmx2 } from "@bundar/htmx/2";
import { createAdminApp } from "./app";
import { createInMemoryArticleRepository } from "./domain";

function fixture() {
  const repository = createInMemoryArticleRepository([
    { title: "Secret alpha", slug: "secret-alpha", status: "published" },
  ]);
  const { app } = createAdminApp({ repository });
  const boundary = new ErrorBoundary({ development: false });
  const client = createTestClient(
    app.compile({ error: (error: Error) => boundary.capture(error) }),
    { dialect: htmx2 },
  );
  return { client, repository };
}

async function loginAs(
  client: ReturnType<typeof fixture>["client"],
  user: string,
) {
  const html = await (await client.get("/login")).text();
  const token = html.match(/name="_csrf"[^>]*value="([^"]*)"/)?.[1] ?? "";
  await client.submitForm("/login", { _csrf: token, user });
}

async function tokenFrom(client: ReturnType<typeof fixture>["client"]) {
  const html = await (await client.get("/articles")).text();
  return html.match(/name="_csrf"[^>]*value="([^"]*)"/)?.[1] ?? "";
}

describe("GH-077 security — authorization parity across request modes", () => {
  test("direct URLs enforce exactly what enhanced requests enforce", async () => {
    const stranger = fixture();
    // viewer on mutations: identical 403 for direct and enhanced attempts
    await loginAs(stranger.client, "viewer");
    const token = await tokenFrom(stranger.client);
    const direct = await stranger.client.post("/articles", {
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    expect(direct.status).toBe(403);
    const enhanced = await stranger.client.submitForm(
      "/articles",
      { _csrf: token, title: "Sneaky title", slug: "sneaky", status: "draft" },
      { headers: { "hx-request": "true", "hx-target": "#form-region" } },
    );
    expect(enhanced.status).toBe(403);
    expect(stranger.repository.query({}).total).toBe(1);
  });

  test("HTMX headers never grant identity: a viewer claiming admin still 403s", async () => {
    const { client } = fixture();
    await loginAs(client, "viewer");
    const token = await tokenFrom(client);
    const attempt = await client.submitForm(
      "/articles/1/delete",
      { _csrf: token },
      {
        headers: {
          "hx-request": "true",
          "hx-trigger": "admin-button",
          "hx-target": "#article-1",
        },
      },
    );
    expect(attempt.status).toBe(403);
    expect(client.jar.get("bundar.session")).toBeDefined();
  });

  test("record identity comes from the route param, never the target header", async () => {
    const { client, repository } = fixture();
    await loginAs(client, "admin");
    const token = await tokenFrom(client);
    // the hx-target points at article-999; the PATH deletes article-1
    const response = await client.submitForm(
      "/articles/1/delete",
      { _csrf: token },
      { headers: { "hx-request": "true", "hx-target": "#article-999" } },
    );
    expect(response.status).toBe(200);
    expect(repository.get(1)).toBeUndefined();
    expect(repository.query({}).total).toBe(0);
  });

  test("unauthenticated reads never leak article data in any mode", async () => {
    const { client } = fixture();
    for (const enhanced of [false, true]) {
      const list = await client.get(
        "/articles",
        enhanced ? { headers: { "hx-request": "true" } } : {},
      );
      expect(list.status).toBe(401);
      const body = await list.text();
      expect(body).not.toContain("Secret alpha");
      const detail = await client.get(
        "/articles/1",
        enhanced ? { headers: { "hx-request": "true" } } : {},
      );
      expect(detail.status).toBe(401);
      expect(await detail.text()).not.toContain("Secret alpha");
    }
  });
});

describe("GH-077 security — CSRF fail-closed on every mutation", () => {
  test("tokenless create/edit/delete/login all fail closed 403", async () => {
    const { client } = fixture();
    for (const [path, fields] of [
      ["/login", { user: "admin" }],
      ["/articles", { title: "Xx title", slug: "xx", status: "draft" }],
      [
        "/articles/1/edit",
        { title: "Yy title", status: "draft", version: "1" },
      ],
      ["/articles/1/delete", {}],
    ] as const) {
      const attempt = await client.submitForm(path, { ...fields });
      expect(attempt.status).toBe(403);
    }
  });

  test("foreign-origin submissions fail closed regardless of token", async () => {
    const { client } = fixture();
    await loginAs(client, "admin");
    const token = await tokenFrom(client);
    const attempt = await client.submitForm(
      "/articles/1/delete",
      { _csrf: token },
      { headers: { origin: "https://attacker.example" } },
    );
    expect(attempt.status).toBe(403);
  });
});

describe("GH-077 security — error paths leak nothing", () => {
  test("404/409/422/401/403 bodies carry messages, never internals", async () => {
    const { client } = fixture();
    await loginAs(client, "admin");
    const token = await tokenFrom(client);
    const cases = [
      await client.submitForm("/articles/999/delete", { _csrf: token }),
      await client.submitForm("/articles/1/edit", {
        _csrf: token,
        title: "Stale edit",
        status: "draft",
        version: "0",
      }),
      await client.submitForm("/articles", {
        _csrf: token,
        title: "x",
        slug: "BAD",
        status: "draft",
      }),
    ];
    for (const response of cases) {
      const body = await response.text();
      expect(body).not.toContain(".ts:");
      expect(body).not.toContain("node_modules");
      expect(body).not.toContain("stack");
    }
    expect(cases[0]!.status).toBe(404);
    expect(cases[1]!.status).toBe(409);
    expect(cases[2]!.status).toBe(422);
  });
});
