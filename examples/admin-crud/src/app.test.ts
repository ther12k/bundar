/**
 * Admin CRUD flows (GH-077): login/roles, table with search/filter/
 * pagination, create/edit/delete, optimistic-concurrency conflicts, audit
 * feed, OOB multi-region updates — no-JS and enhanced lanes from one
 * fixture with the production error boundary compiled in.
 */
import { describe, expect, test } from "bun:test";
import { ErrorBoundary } from "@bundar/core";
import { createTestClient } from "@bundar/testing";
import { htmx2 } from "@bundar/htmx/2";
import { createAdminApp } from "./app";
import { createInMemoryArticleRepository } from "./domain";

function fixture() {
  const repository = createInMemoryArticleRepository([
    { title: "Alpha announcement", slug: "alpha", status: "published" },
    { title: "Beta notes", slug: "beta", status: "draft" },
    { title: "Gamma plan", slug: "gamma", status: "published" },
    { title: "Delta follow-up", slug: "delta", status: "draft" },
    { title: "Epsilon draft", slug: "epsilon", status: "draft" },
    { title: "Zeta tail", slug: "zeta", status: "published" },
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
): Promise<void> {
  const html = await (await client.get("/login")).text();
  const token = html.match(/name="_csrf"[^>]*value="([^"]*)"/)?.[1] ?? "";
  const response = await client.submitForm("/login", { _csrf: token, user });
  expect(response.status).toBe(303);
}

async function tokenFrom(
  client: ReturnType<typeof fixture>["client"],
): Promise<string> {
  const html = await (await client.get("/articles")).text();
  return html.match(/name="_csrf"[^>]*value="([^"]*)"/)?.[1] ?? "";
}

describe("GH-077 admin — authentication and roles", () => {
  test("unauthenticated access gets a generic 401 document — enhanced too", async () => {
    const { client } = fixture();
    const ordinary = await client.get("/articles");
    expect(ordinary.status).toBe(401);
    const body = await ordinary.text();
    expect(body).toContain("Sign in required");
    expect(body).not.toContain("Alpha");
    const enhanced = await client.enhancedGet("/articles");
    expect(enhanced.status).toBe(401);
  });

  test("viewer can read but not create; editor can create; admin can delete", async () => {
    const viewer = fixture();
    await loginAs(viewer.client, "viewer");
    const list = await (await viewer.client.get("/articles")).text();
    expect(list).toContain("Alpha announcement");
    expect(list).toContain("Viewers cannot create articles");
    const viewerToken = await tokenFrom(viewer.client);
    const denied = await viewer.client.submitForm("/articles", {
      _csrf: viewerToken,
      title: "Nope title",
      slug: "nope",
      status: "draft",
    });
    expect(denied.status).toBe(403);

    const editor = fixture();
    await loginAs(editor.client, "editor");
    const editorToken = await tokenFrom(editor.client);
    const created = await editor.client.submitForm("/articles", {
      _csrf: editorToken,
      title: "New from editor",
      slug: "new-from-editor",
      status: "draft",
    });
    expect(created.status).toBe(303);
    const editorToken2 = await tokenFrom(editor.client);
    const deleteDenied = await editor.client.submitForm("/articles/1/delete", {
      _csrf: editorToken2,
    });
    expect(deleteDenied.status).toBe(403);

    const admin = fixture();
    await loginAs(admin.client, "admin");
    const adminToken = await tokenFrom(admin.client);
    const deleted = await admin.client.submitForm("/articles/1/delete", {
      _csrf: adminToken,
    });
    expect(deleted.status).toBe(303);
  });
});

describe("GH-077 admin — table, search, filter, pagination", () => {
  test("pagination shows page 1 of 2 with six seeded rows", async () => {
    const { client } = fixture();
    await loginAs(client, "viewer");
    const html = await (await client.get("/articles")).text();
    expect(html).toContain("Page 1 of 2");
    expect(html).toContain("6 total");
    expect(html).toContain('id="article-1"');
    expect(html).not.toContain('id="article-6"');
    const page2 = await (await client.get("/articles?page=2")).text();
    expect(page2).toContain('id="article-6"');
  });

  test("search and status filter narrow the table", async () => {
    const { client } = fixture();
    await loginAs(client, "viewer");
    const search = await (await client.get("/articles?q=beta")).text();
    expect(search).toContain("Beta notes");
    expect(search).not.toContain("Alpha announcement");
    const drafts = await (await client.get("/articles?status=draft")).text();
    expect(drafts).toContain("Beta notes");
    expect(drafts).not.toContain("Alpha announcement");
  });
});

describe("GH-077 admin — create/edit conflicts and audit", () => {
  test("create through PRG with validation errors at 422", async () => {
    const { client } = fixture();
    await loginAs(client, "editor");
    const token = await tokenFrom(client);
    const invalid = await client.submitForm("/articles", {
      _csrf: token,
      title: "x",
      slug: "BAD SLUG",
      status: "draft",
    });
    expect(invalid.status).toBe(422);
    expect(await invalid.text()).toContain("Invalid title, slug, or status");

    const retryToken = await tokenFrom(client);
    const valid = await client.submitForm("/articles", {
      _csrf: retryToken,
      title: "Valid article",
      slug: "valid-article",
      status: "published",
    });
    expect(valid.status).toBe(303);
  });

  test("stale version edit → 409 conflict; fresh version succeeds", async () => {
    const { client } = fixture();
    await loginAs(client, "editor");
    const token = await tokenFrom(client);
    const stale = await client.submitForm("/articles/2/edit", {
      _csrf: token,
      title: "Stale edit",
      status: "draft",
      version: "0",
    });
    expect(stale.status).toBe(409);
    expect(await stale.text()).toContain("Someone else changed this article");

    const freshToken = await tokenFrom(client);
    const fresh = await client.submitForm("/articles/2/edit", {
      _csrf: freshToken,
      title: "Fresh edit",
      status: "published",
      version: "1",
    });
    expect(fresh.status).toBe(303);
    expect(await (await client.get("/articles/2")).text()).toContain("v2");
  });

  test("the audit feed records every mutation", async () => {
    const { client } = fixture();
    await loginAs(client, "admin");
    const token = await tokenFrom(client);
    await client.submitForm("/articles/1/delete", { _csrf: token });
    const html = await (await client.get("/articles")).text();
    expect(html).toContain('id="audit-region"');
    expect(html).toContain("admin · delete · article:1");
  });
});

describe("GH-077 admin — enhanced multi-region updates", () => {
  test("enhanced edit returns row markup + OOB audit feed", async () => {
    const { client } = fixture();
    await loginAs(client, "editor");
    const response = await client.submitForm(
      "/articles/2/edit",
      {
        _csrf: await tokenFrom(client),
        title: "Enhanced edit",
        status: "draft",
        version: "1",
      },
      { headers: { "hx-request": "true", "hx-target": "#form-region" } },
    );
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('id="article-2"');
    expect(body).toContain("Enhanced edit");
    expect(body).toContain('id="audit-region"');
    expect(body).toContain("editor · update · article:2");
    expect(body).not.toContain("<html");
  });

  test("enhanced delete carries row-removal + audit-refresh intents", async () => {
    const { client } = fixture();
    await loginAs(client, "admin");
    const response = await client.submitForm(
      "/articles/1/delete",
      { _csrf: await tokenFrom(client) },
      { headers: { "hx-request": "true", "hx-target": "#article-1" } },
    );
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('id="article-1"'); // OOB remove element
    expect(body).toContain("admin · delete · article:1");
  });
});
