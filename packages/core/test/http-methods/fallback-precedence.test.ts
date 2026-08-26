/**
 * BR-096 (#148): the 405/Allow/auto-OPTIONS fallback candidate order must
 * mirror native Bun precedence — exact, then parameter, then wildcard,
 * then catch-all (documented Bun order) — INDEPENDENT of static-segment
 * count. The audit counterexample: `GET /a/:x/:y/:z` alongside
 * `POST /a/b/c/*`; a wildcard with more static segments must never beat a
 * parameter route when the fallback computes Allow/OPTIONS.
 *
 * Part 1 pins NATIVE Bun dispatch order with a plain-Bun.serve fixture
 * (the BR-069 fixture pattern — no Bundar code involved). Parts 2–3 prove
 * Bundar's compiled fallback selects the same route group on the
 * counterexample and across a structural corpus.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { App } from "../../src/app";

// ---------------------------------------------------------------------------
// Part 1: native precedence pinned on plain Bun.serve
// ---------------------------------------------------------------------------

const native = Bun.serve({
  port: 0,
  routes: {
    "/a/:x/:y/:z": {
      GET: () => new Response("param"),
    },
    "/a/b/c/*": {
      POST: () => new Response("wildcard"),
    },
  },
  // Plain fetch handler records that NOTHING matched — this is where an
  // unmatched request lands natively when no route fires.
  fetch: () => new Response("miss", { status: 404 }),
});
afterAll(() => native.stop(true));

describe("BR-096 native Bun.serve precedence (plain fixture)", () => {
  test("parameter beats wildcard regardless of static-segment count", async () => {
    // GET /a/b/c/d matches BOTH patterns structurally; /a/b/c/* carries the
    // longer static prefix (/a/b/c) while /a/:x/:y/:z has only /a. Native
    // documented order says exact > param > wildcard — so "param" must win.
    const response = await fetch(`http://localhost:${native.port}/a/b/c/d`);
    expect(await response.text()).toBe("param");
  });

  test("wildcard still serves when it is the only structural match", async () => {
    // POST has no param handler registered; depth beyond :z leaves the
    // wildcard as the only match.
    const response = await fetch(`http://localhost:${native.port}/a/b/c/d/e`, {
      method: "POST",
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("wildcard");
  });

  test("unregistered method falls back to plain 404 (no Allow computation)", async () => {
    const response = await fetch(`http://localhost:${native.port}/a/b/c/d`, {
      method: "PUT",
    });
    expect(response.status).toBe(404);
    expect(response.headers.get("allow")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Part 2: Bundar fallback on the counterexample
// ---------------------------------------------------------------------------

function compile(register: (app: App) => void) {
  const app = new App();
  register(app);
  return app.compile();
}

function buildCounterexample(): ReturnType<typeof compile> {
  return compile((app) => {
    app.get("/a/:x/:y/:z", () => new Response("param"));
    app.post("/a/b/c/*", () => new Response("wildcard"));
  });
}

type FetchLike = (request: Request) => Response | Promise<Response>;

async function probe(
  compiled: { fetch: FetchLike },
  path: string,
  method: string,
): Promise<{ status: number; allow: string | null }> {
  const response = await compiled.fetch(
    new Request(`http://bench.invalid${path}`, { method }),
  );
  return { status: response.status, allow: response.headers.get("allow") };
}

describe("BR-096 Bundar fallback mirrors native order (counterexample)", () => {
  const compiled = buildCounterexample();

  test("unregistered method 405s with Allow from the PARAMETER group", async () => {
    // PUT /a/b/c/d: the wildcard /a/b/c/* has more static segments, but the
    // parameter pattern is the group native routing would select — so
    // Allow must be computed from GET (+ implicit HEAD/OPTIONS), never POST.
    const result = await probe(compiled, "/a/b/c/d", "PUT");
    expect(result.status).toBe(405);
    expect(result.allow).toBe("GET, HEAD, OPTIONS");
  });

  test("auto-OPTIONS answers from the same parameter group", async () => {
    const result = await probe(compiled, "/a/b/c/d", "OPTIONS");
    expect(result.status).toBe(204);
    expect(result.allow).toBe("GET, HEAD, OPTIONS");
  });

  test("explicitly registered wildcard methods stay reachable through dispatch", async () => {
    // Dispatch itself is delegated to Bun.serve in production (GH-015):
    // compiled.fetch is ONLY the 404/405 fallback. A real socket proves
    // the wildcard route still serves its own POST.
    const app = new App();
    app.get("/a/:x/:y/:z", () => new Response("param"));
    app.post("/a/b/c/*", () => new Response("wildcard"));
    const server = app.serve({ port: 0 });
    try {
      const response = await fetch(`${server.url.origin}/a/b/c/d/e`, {
        method: "POST",
      });
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("wildcard");
      // And GET chooses the param group natively even though the wildcard
      // carries more static segments:
      const getResponse = await fetch(`${server.url.origin}/a/b/c/d`);
      expect(await getResponse.text()).toBe("param");
    } finally {
      server.stop(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Part 3: structural corpus — every case asserts category-first selection
// ---------------------------------------------------------------------------

interface CorpusCase {
  readonly name: string;
  /** Parameter-category pattern (its method group must win Allow/OPTIONS). */
  readonly paramPattern: string;
  /** Wildcard pattern with MORE or EQUAL static segments. */
  readonly wildcardPattern: string;
  readonly requestPath: string;
  /** Allow header expected from the category-first winner. */
  readonly expectedAllow: string;
}

const corpus: readonly CorpusCase[] = [
  {
    name: "audit counterexample: param /a/:x/:y/:z vs wildcard-with-more-statics /a/b/c/*",
    paramPattern: "/a/:x/:y/:z",
    wildcardPattern: "/a/b/c/*",
    requestPath: "/a/b/c/d",
    expectedAllow: "GET, HEAD, OPTIONS",
  },
  {
    name: "prefix param /p/:id/view vs longer-static suffix wildcard /p/admin/*",
    paramPattern: "/p/:id/view",
    wildcardPattern: "/p/admin/*",
    requestPath: "/p/admin/view",
    expectedAllow: "GET, HEAD, OPTIONS",
  },
  {
    name: "equal static depth keeps param first (/q/:a/:b vs /q/r/*)",
    paramPattern: "/q/:a/:b",
    wildcardPattern: "/q/r/*",
    requestPath: "/q/r/s",
    expectedAllow: "GET, HEAD, OPTIONS",
  },
  {
    name: "deep param tail beats broad catch-all (/m/:u/:v/:w vs /m/*)",
    paramPattern: "/m/:u/:v/:w",
    wildcardPattern: "/m/*",
    requestPath: "/m/x/y/z",
    expectedAllow: "GET, HEAD, OPTIONS",
  },
];

describe("BR-096 fallback corpus (Allow/OPTIONS category-first in every case)", () => {
  for (const c of corpus) {
    test(`corpus: ${c.name}`, async () => {
      const app = compile((registration) => {
        registration.get(c.paramPattern, () => new Response("param-group"));
        registration.post(
          c.wildcardPattern,
          () => new Response("wildcard-group"),
        );
      });
      const put = await probe(app, c.requestPath, "PUT");
      expect(put.status).toBe(405);
      expect(put.allow).toBe(c.expectedAllow);
      const options = await probe(app, c.requestPath, "OPTIONS");
      expect(options.status).toBe(204);
      expect(options.allow).toBe(c.expectedAllow);
    });
  }

  test("late-registered wildcards cannot shadow earlier parameters", async () => {
    const app = compile((registration) => {
      registration.get("/s/:id/detail", () => new Response("param"));
      registration.post("/s/admin/*", () => new Response("wildcard-late"));
    });
    const result = await probe(app, "/s/admin/detail", "PATCH");
    expect(result.allow).toBe("GET, HEAD, OPTIONS");
  });
});
