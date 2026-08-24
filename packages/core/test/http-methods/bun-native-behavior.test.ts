import { afterAll, describe, expect, test } from "bun:test";

/**
 * BR-069 compatibility fixture: pins the two pieces of *raw* Bun.serve
 * native-router behavior that packages/core/src/routing/methods.ts is built
 * on top of, using plain `Bun.serve` with no Bundar layer at all. If a future
 * Bun release changes either of these, this fixture fails loudly instead of
 * Bundar silently inheriting a different contract.
 *
 * Verified against Bun 1.4.0 (matches the CONTRIBUTING.md minimum).
 */
const server = Bun.serve({
  port: 0,
  routes: {
    "/get-only": { GET: () => new Response("hello", { status: 200 }) },
  },
  fetch: () => new Response("app-level fetch fallback", { status: 404 }),
});

afterAll(() => server.stop(true));

const base = () => `http://localhost:${server.port}`;

describe("BR-069 Bun 1.4.0 native method behavior (no Bundar layer)", () => {
  test("HEAD on a GET-only route is answered natively: 200, GET's headers, empty body", async () => {
    const response = await fetch(`${base()}/get-only`, { method: "HEAD" });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });

  test("a method never registered on a known path falls through to `fetch`, indistinguishable from an unknown path", async () => {
    const wrongMethod = await fetch(`${base()}/get-only`, { method: "POST" });
    const unknownPath = await fetch(`${base()}/genuinely-unknown`);

    // This is the exact gap BR-069 closes: raw Bun gives no signal here that
    // /get-only exists at all for POST. Both requests produce the identical
    // app-level 404. packages/core/src/routing/methods.ts fixes this at the
    // Bundar layer by giving Bun a full method table per path, not by
    // changing this native behavior.
    expect(wrongMethod.status).toBe(404);
    expect(unknownPath.status).toBe(404);
    expect(await wrongMethod.text()).toBe(await unknownPath.text());
  });

  test("raw Bun does not answer OPTIONS automatically either", async () => {
    const response = await fetch(`${base()}/get-only`, { method: "OPTIONS" });
    expect(response.status).toBe(404);
  });
});
