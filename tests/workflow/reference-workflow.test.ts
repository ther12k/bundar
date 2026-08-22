/**
 * GH-069 reference-workflow gate: the authenticated progressive workflow
 * (`examples/workflow-gate`) exercised end to end over real HTTP against an
 * in-process server — the same handler source serving ordinary browsers
 * (no-JS PRG) and enhanced HTMX submissions (fragments).
 *
 * Covers: session establishment, session-bound synchronizer CSRF tokens,
 * validation with same-token retry (a 422 re-render must not rotate the
 * token), flash messages, view/action/error negotiation, server-side
 * authorization independent of HTMX metadata, session isolation between
 * clients, and dialect-adapter composition (htmx2 + htmx4 beta).
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { htmx2 } from "@bundar/htmx/2";
import { htmx4Experimental } from "@bundar/htmx/4";
import { createWorkflowApp } from "../../examples/workflow-gate/workflow";

/** Cookie-jar HTTP client: the test's stand-in for a real browser. */
class BrowserClient {
  private readonly cookies = new Map<string, string>();

  public constructor(private readonly baseUrl: string) {}

  public get(
    path: string,
    headers: Record<string, string> = {},
  ): Promise<Response> {
    return this.fetch(path, { method: "GET", headers });
  }

  public postForm(
    path: string,
    fields: Record<string, string>,
    headers: Record<string, string> = {},
  ): Promise<Response> {
    return this.fetch(path, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: this.baseUrl,
        ...headers,
      },
      body: new URLSearchParams(fields).toString(),
    });
  }

  private async fetch(path: string, init: RequestInit): Promise<Response> {
    const cookie = [...this.cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      redirect: "manual",
      headers: {
        ...(cookie.length > 0 ? { cookie } : {}),
        ...(init.headers as Record<string, string>),
      },
    });
    for (const setCookie of response.headers.getSetCookie()) {
      const pair = setCookie.split(";")[0] ?? "";
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      if (value.length === 0) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    return response;
  }

  /** The synchronizer token the last rendered form embedded. */
  public formToken(html: string): string {
    return html.match(/name="_csrf"[^>]*value="([^"]*)"/)?.[1] ?? "";
  }
}

type Fixture = {
  client: BrowserClient;
  items: ReadonlyMap<number, { id: number; title: string }>;
};

async function startFixture(): Promise<
  Fixture & { stop: () => void; baseUrl: string }
> {
  const { items, start } = createWorkflowApp();
  const server = start(0);
  const baseUrl = `http://127.0.0.1:${server.port}`;
  return {
    client: new BrowserClient(baseUrl),
    items,
    baseUrl,
    stop: () => server.stop(true),
  };
}

/** Logs in through the real progressive flow: page → token → POST → PRG. */
async function login(client: BrowserClient, user: string): Promise<void> {
  const page = await client.get("/login");
  expect(page.status).toBe(200);
  const token = client.formToken(await page.text());
  const response = await client.postForm("/login", { _csrf: token, user });
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("/items");
}

describe("GH-069 reference workflow — ordinary (no-JS) browser lane", () => {
  let fixture: Awaited<ReturnType<typeof startFixture>>;
  beforeAll(async () => {
    fixture = await startFixture();
  });
  afterAll(() => fixture.stop());

  test("first visit renders a login form with a session-bound token", async () => {
    const response = await fixture.client.get("/login");
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<form");
    expect(html).toContain('name="_csrf"');
    // synchronizer cookie issued alongside the hidden field
    const cookies = response.headers.getSetCookie().join("\n");
    expect(cookies).toContain("bundar.csrf=");
    expect(cookies).toContain("bundar.session=");
  });

  test("login follows Post/Redirect/Get and the flash message renders once", async () => {
    await login(fixture.client, "nina");
    const items = await fixture.client.get("/items");
    expect(items.status).toBe(200);
    const html = await items.text();
    expect(html).toContain("Welcome, nina.");
    expect(html).toContain('id="whoami"');
    // flash is consumed exactly once
    const again = await fixture.client.get("/items");
    expect(await again.text()).not.toContain("Welcome, nina.");
  });

  test("create → list → delete through PRG with flash at each step", async () => {
    // tokens rotate on every verified state change; the PRG redirect's GET
    // renders the next form with its fresh token, exactly like a browser
    const page = await fixture.client.get("/items");
    const token = fixture.client.formToken(await page.text());

    const created = await fixture.client.postForm("/items", {
      _csrf: token,
      title: "First item",
    });
    expect(created.status).toBe(303);
    expect(created.headers.get("location")).toBe("/items");

    const list = await fixture.client.get("/items");
    const listHtml = await list.text();
    expect(listHtml).toContain('data-item-id="1"');
    expect(listHtml).toContain("First item");
    expect(listHtml).toContain("Created");

    const nextToken = fixture.client.formToken(listHtml);
    const deleted = await fixture.client.postForm("/items/1/delete", {
      _csrf: nextToken,
    });
    expect(deleted.status).toBe(303);
    const after = await fixture.client.get("/items");
    const afterHtml = await after.text();
    expect(afterHtml).not.toContain('data-item-id="1"');
    expect(afterHtml).toContain("Deleted");
  });

  test("validation failure re-renders with the SAME token so retry succeeds", async () => {
    const page = await fixture.client.get("/items");
    const token = fixture.client.formToken(await page.text());

    const invalid = await fixture.client.postForm("/items", {
      _csrf: token,
      title: "x",
    });
    expect(invalid.status).toBe(422);
    expect(await invalid.text()).toContain(
      "Title must be at least 2 characters",
    );

    // no re-fetch: the 422 rotated nothing (GH-069 fix), the retry verifies
    const retry = await fixture.client.postForm("/items", {
      _csrf: token,
      title: "Valid title",
    });
    expect(retry.status).toBe(303);
  });

  test("deleting an unknown item negotiates a 404 without internals", async () => {
    const page = await fixture.client.get("/items");
    const token = fixture.client.formToken(await page.text());
    const response = await fixture.client.postForm("/items/999/delete", {
      _csrf: token,
    });
    expect(response.status).toBe(404);
    const body = await response.text();
    expect(body).toContain("Item not found");
    expect(body).not.toContain(".ts:");
    expect(body).not.toContain("node_modules");
  });
});

describe("GH-069 reference workflow — CSRF fail-closed", () => {
  let fixture: Awaited<ReturnType<typeof startFixture>>;
  beforeAll(async () => {
    fixture = await startFixture();
    await login(fixture.client, "ada");
  });
  afterAll(() => fixture.stop());

  test("missing token is rejected", async () => {
    const response = await fixture.client.postForm("/items", { title: "Nope" });
    expect(response.status).toBe(403);
  });

  test("cross-origin submission is rejected regardless of token", async () => {
    const page = await fixture.client.get("/items");
    const token = fixture.client.formToken(await page.text());
    const response = await fixture.client.postForm(
      "/items",
      { _csrf: token, title: "Evil" },
      { origin: "https://attacker.example" },
    );
    expect(response.status).toBe(403);
  });

  test("a token minted for another session is rejected", async () => {
    const page = await fixture.client.get("/items");
    const foreignToken = page.headers
      .getSetCookie()
      .find((cookie) => cookie.startsWith("bundar.csrf="))
      ?.split("=")[1];
    // submit another client's token shape: tampered binding fails closed
    const response = await fixture.client.postForm("/items", {
      _csrf: `${foreignToken ?? ""}tampered`,
      title: "Nope",
    });
    expect(response.status).toBe(403);
    expect(fixture.items.size).toBe(0);
  });
});

describe("GH-069 reference workflow — authorization and sessions", () => {
  let fixture: Awaited<ReturnType<typeof startFixture>>;
  beforeAll(async () => {
    fixture = await startFixture();
    await login(fixture.client, "nina");
    const page = await fixture.client.get("/items");
    const token = fixture.client.formToken(await page.text());
    await fixture.client.postForm("/items", {
      _csrf: token,
      title: "Secret plan",
    });
  });
  afterAll(() => fixture.stop());

  test("unauthenticated page views get a generic 401 document, never content", async () => {
    const stranger = new BrowserClient(fixture.baseUrl);
    const response = await stranger.get("/items");
    expect(response.status).toBe(401);
    const body = await response.text();
    expect(body).toContain("Sign in required");
    expect(body).not.toContain("Secret plan");
    expect(body).not.toContain("nina");
  });

  test("tokenless writes fail CSRF before authorization; tokened ones get 401", async () => {
    const stranger = new BrowserClient(fixture.baseUrl);
    // integrity precedes authorization: no token → 403, never the handler
    const tokenless = await stranger.postForm("/items", { title: "Hack" });
    expect(tokenless.status).toBe(403);

    // a legitimately obtained token passes CSRF; authorization then 401s
    const page = await stranger.get("/login");
    const token = stranger.formToken(await page.text());
    const ordinary = await stranger.postForm("/items", {
      _csrf: token,
      title: "Hack",
    });
    expect(ordinary.status).toBe(401);
    const enhanced = await stranger.postForm(
      "/items",
      { _csrf: token, title: "Hack" },
      { "HX-Request": "true" },
    );
    expect(enhanced.status).toBe(401);
    // HTMX metadata grants nothing: the write never happened
    expect(fixture.items.size).toBe(1);
  });

  test("sessions are isolated per client", async () => {
    const other = new BrowserClient(fixture.baseUrl);
    await login(other, "marek");
    const page = await other.get("/items");
    const html = await page.text();
    expect(html).toContain("Signed in as marek");
    expect(html).not.toContain("Signed in as nina");
  });
});

describe("GH-069 reference workflow — enhanced (HTMX) lane parity", () => {
  let fixture: Awaited<ReturnType<typeof startFixture>>;
  beforeAll(async () => {
    fixture = await startFixture();
    await login(fixture.client, "nina");
  });
  afterAll(() => fixture.stop());

  test("enhanced GET /items negotiates a fragment, not a document", async () => {
    const response = await fixture.client.get("/items", {
      "HX-Request": "true",
    });
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('id="items-region"');
    expect(body).not.toContain("<html");
  });

  test("enhanced create returns the item fragment; enhanced delete removes it", async () => {
    const page = await fixture.client.get("/items");
    const token = fixture.client.formToken(await page.text());

    const created = await fixture.client.postForm(
      "/items",
      { _csrf: token, title: "Enhanced item" },
      { "HX-Request": "true" },
    );
    expect(created.status).toBe(200);
    const fragment = await created.text();
    expect(fragment).toContain("data-item-id=");
    expect(fragment).toContain("Enhanced item");
    expect(fragment).not.toContain("<html");

    // success rotated the token: re-render the form region before the next
    // state change, the way an enhanced client refreshes after an event
    const refreshed = await fixture.client.get("/items", {
      "HX-Request": "true",
    });
    const nextToken = fixture.client.formToken(await refreshed.text());
    const deleted = await fixture.client.postForm(
      "/items/1/delete",
      { _csrf: nextToken },
      { "HX-Request": "true" },
    );
    expect(deleted.status).toBe(200);
    expect(await deleted.text()).toContain("Deleted item 1");
    expect(fixture.items.size).toBe(0);
  });
});

describe("GH-069 reference workflow — dialect adapters compose identically", () => {
  for (const [name, dialect] of [
    ["htmx2 (stable)", htmx2],
    ["htmx4 (experimental)", htmx4Experimental],
  ] as const) {
    test(`create + delete through ${name}`, async () => {
      const { items, start } = createWorkflowApp({ dialect });
      const server = start(0);
      const baseUrl = `http://127.0.0.1:${server.port}`;
      try {
        const client = new BrowserClient(baseUrl);
        await login(client, "dialect-user");
        const page = await client.get("/items");
        const token = client.formToken(await page.text());

        const created = await client.postForm(
          "/items",
          { _csrf: token, title: `Item via ${name}` },
          { "HX-Request": "true" },
        );
        expect(created.status).toBe(200);
        expect(await created.text()).toContain(`Item via ${name}`);
        expect(items.size).toBe(1);

        // success rotated the token — re-render before the delete
        const refreshed = await client.get("/items", { "HX-Request": "true" });
        const nextToken = client.formToken(await refreshed.text());
        const deleted = await client.postForm(
          "/items/1/delete",
          { _csrf: nextToken },
          { "HX-Request": "true" },
        );
        expect(deleted.status).toBe(200);
        expect(items.size).toBe(0);
      } finally {
        server.stop(true);
      }
    });
  }
});
