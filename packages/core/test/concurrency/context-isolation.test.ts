import { afterAll, describe, expect, test } from "bun:test";
import { App } from "../../src/app";

/**
 * GH-017: per-request state cannot leak across concurrent requests.
 * N concurrent in-flight requests each write state keyed by their own id and
 * assert isolation while all requests overlap.
 */
const CONCURRENCY = 64;

const app = new App();

app.get("/isolate/:id", async (context) => {
  const id = context.params.id as string;
  context.state.owner = id;
  // Hold every request in flight until all writers have run.
  context.state.gate = gate;
  await gate;
  const observed = context.state.owner;
  return new Response(observed === id ? `ok:${id}` : `leak:${id}:${observed}`);
});

let resolveGate: () => void;
const gate = new Promise<void>((resolve) => {
  resolveGate = resolve;
});

const server = app.serve({ port: 0 });
const base = `http://localhost:${server.port}`;

afterAll(() => {
  server.stop(true);
});

describe("GH-017 concurrent context isolation", () => {
  test("state written by one request is invisible to all others", async () => {
    const requests = Array.from({ length: CONCURRENCY }, (_, i) =>
      fetch(`${base}/isolate/${i}`).then((response) => response.text()),
    );
    // Let the event loop admit all requests before releasing the gate.
    await Promise.resolve();
    resolveGate!();

    const results = await Promise.all(requests);
    const leaked = results.filter((result) => result.startsWith("leak:"));
    expect(leaked).toEqual([]);
    expect(results.length).toBe(CONCURRENCY);
    const ok = results.filter((result) => result.startsWith("ok:"));
    expect(ok.length).toBe(CONCURRENCY);
    expect(new Set(results).size).toBe(CONCURRENCY);
  });

  test("sequential requests also observe fresh state", async () => {
    const first = await (await fetch(`${base}/isolate/first`)).text();
    const second = await (await fetch(`${base}/isolate/second`)).text();
    expect(first).toBe("ok:first");
    expect(second).toBe("ok:second");
  });
});
