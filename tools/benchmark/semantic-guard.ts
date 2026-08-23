/**
 * Semantic performance guard for bench:regression (BR-004).
 *
 * Ratio budgets tolerate wide variance headroom, so a reintroduced
 * per-request middleware composer can hide inside timing noise (measured at
 * roughly 1.30x observed versus a 2.4x fail threshold on the sync-middleware
 * scenario). This guard closes that gap deterministically: middleware chains
 * MUST compose exactly once per non-empty compiled route/method entry during
 * app.compile(), never per request. Any per-request composition trips the
 * gate regardless of machine speed or load.
 */
import { App } from "../../packages/core/src/app";
import { onMiddlewareComposition } from "../../packages/core/src/composition-seam";

export function semanticGuardFailures(): string[] {
  const failures: string[] = [];

  // Case 1: global middleware on a dynamic route — one composition at
  // compile time, zero during requests.
  {
    const app = new App();
    app.use((_context, next) => next(_context));
    app.get("/guarded", () => new Response("ok"));

    const events: number[] = [];
    const off = onMiddlewareComposition((count) => events.push(count));
    try {
      const compiled = app.compile();
      const entry = compiled.routes["/guarded"] as Record<
        string,
        (request: Request) => Response | Promise<Response>
      >;
      const handler = entry["GET"];
      if (handler === undefined) throw new Error("GET entry missing");
      for (let index = 0; index < 25; index += 1) {
        void handler(new Request("http://bench/guarded"));
      }
      if (JSON.stringify(events) !== JSON.stringify([1])) {
        failures.push(
          `middleware composition ran ${events.length} time(s) for one compiled ` +
            `route across 25 requests (events: [${events.join(", ")}]); ` +
            `expected exactly 1 during compile() — per-request composer reintroduced?`,
        );
      }
      void compiled;
    } finally {
      off();
    }
  }

  // Case 2: middleware-free dynamic route never reaches the composer.
  {
    const app = new App();
    app.get("/plain", () => new Response("ok"));

    let compositions = 0;
    const off = onMiddlewareComposition(() => {
      compositions += 1;
    });
    try {
      const compiled = app.compile();
      const entry = compiled.routes["/plain"] as Record<
        string,
        (request: Request) => Response | Promise<Response>
      >;
      const handler = entry["GET"];
      if (handler === undefined) throw new Error("GET entry missing");
      for (let index = 0; index < 25; index += 1) {
        void handler(new Request("http://bench/plain"));
      }
      if (compositions !== 0) {
        failures.push(
          `middleware-free route triggered ${compositions} composition(s); expected none`,
        );
      }
    } finally {
      off();
    }
  }

  return failures;
}
