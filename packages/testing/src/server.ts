/**
 * Real-server opt-in for Bun integration cases (GH-074).
 *
 * In-process dispatch covers route logic without a socket; some behaviors
 * belong to Bun.serve itself (its native route matching, error hook, idle
 * timeouts). `startTestServer` runs the app on an ephemeral port and hands
 * back the SAME client interface, transport-backed. Servers register in a
 * module-level registry so `stopAllTestServers()` gives suites a guaranteed
 * teardown path — no leaked ports across a test run.
 */
import { App } from "@bundar/core";
import type { RouteModule } from "@bundar/core";
import { CookieJar } from "./cookies";
import {
  compileForTest,
  type TestClient,
  type TestClientOptions,
  type TestClientTarget,
} from "./client";
import {
  enhancedRequest,
  formRequest,
  jsonRequest,
  multipartRequest,
} from "./request";
import { buildHtmxRequestHeaders } from "@bundar/htmx";

export interface TestServer {
  readonly mode: "real-server";
  readonly url: string;
  readonly port: number;
  /** Same interface as the in-process client, transport-backed. */
  readonly client: TestClient;
  /** Stops the server and unregisters it; safe to call twice. */
  stop(): void;
}

const runningServers = new Set<ReturnType<typeof Bun.serve>>();

/** Starts the app on an ephemeral port with leak-safe registration. */
export function startTestServer(
  target: TestClientTarget,
  options: TestClientOptions & { readonly port?: number } = {},
): TestServer {
  const compiled = compileForTest(target, options);
  const server = Bun.serve({
    ...compiled,
    port: options.port ?? 0,
    // Bun's own default is an opaque 500; wiring it explicitly keeps the
    // same observable answer without Bun's uncaught-error console noise
    // (Bun reports the throw to the test runner even though fetch
    // resolves). The in-process client instead REJECTS on uncaught errors
    // — the documented transport distinction.
    error:
      compiled.error ??
      (() =>
        new Response(null, {
          status: 500,
          statusText: "Internal Server Error",
        })),
  });
  runningServers.add(server);

  const port = server.port ?? 0;
  const url = `http://127.0.0.1:${port}`;
  const jar = new CookieJar();
  const useJar = options.cookies !== false;
  const { dialect } = options;

  const send = async (request: Request): Promise<Response> => {
    // requests are built against TEST_ORIGIN; the transport rewrites them
    // onto this server's real origin (path + query preserved)
    const sourceUrl = new URL(request.url);
    const target = `${url}${sourceUrl.pathname}${sourceUrl.search}`;
    const response = await fetch(target, {
      method: request.method,
      headers: transportHeaders(request.headers),
      ...(request.method !== "GET" && request.method !== "HEAD"
        ? { body: await request.clone().arrayBuffer() }
        : {}),
      redirect: "manual",
    });
    if (useJar) jar.absorb(response);
    return response;
  };

  /**
   * Headers for the outgoing transport request: the jar's cookie header,
   * plus origin/host rewritten onto the real server so CSRF origin checks
   * see a same-origin submission the way a browser on that port would.
   */
  function transportHeaders(headers: Headers): Headers {
    const merged = new Headers(headers);
    if (useJar && jar.size > 0) merged.set("cookie", jar.header());
    if (merged.has("origin")) merged.set("origin", url);
    if (merged.has("host")) merged.set("host", `127.0.0.1:${port}`);
    return merged;
  }

  const client: TestClient = {
    mode: "real-server",
    url,
    jar,
    ...(dialect !== undefined ? { dialect } : {}),
    fetch: (input) =>
      send(
        input instanceof Request
          ? input
          : enhancedRequest(input, { method: "GET" }),
      ),
    get: (path, init = {}) =>
      send(enhancedRequest(path, { ...init, method: "GET" })),
    post: (path, init = {}) =>
      send(enhancedRequest(path, { ...init, method: "POST" })),
    put: (path, init = {}) =>
      send(enhancedRequest(path, { ...init, method: "PUT" })),
    patch: (path, init = {}) =>
      send(enhancedRequest(path, { ...init, method: "PATCH" })),
    delete: (path, init = {}) =>
      send(enhancedRequest(path, { ...init, method: "DELETE" })),
    head: (path, init = {}) =>
      send(enhancedRequest(path, { ...init, method: "HEAD" })),
    submitForm: (path, fields, init = {}) =>
      send(formRequest(path, fields, init)),
    submitMultipart: (path, parts, init = {}) =>
      send(multipartRequest(path, parts, init)),
    submitJson: (path, value, init = {}) =>
      send(jsonRequest(path, value, init)),
    enhancedGet: (path, htmx, init = {}) =>
      send(
        enhancedRequest(path, {
          ...init,
          method: "GET",
          ...(dialect !== undefined ? { dialect } : {}),
          ...(htmx !== undefined ? { htmx } : {}),
        }),
      ),
    enhancedSubmitForm: (path, fields, htmx, init = {}) =>
      send(
        formRequest(path, fields, {
          ...init,
          headers: {
            ...((init.headers as Record<string, string> | undefined) ?? {}),
            ...(htmx !== undefined
              ? buildHtmxRequestHeaders(htmx, dialect)
              : {}),
          },
        }),
      ),
    follow: (response, maxHops = 5) => followChain(client, response, maxHops),
    dispose: () => {
      jar.clear();
    },
  };

  return {
    mode: "real-server",
    url,
    port,
    client,
    stop: () => {
      if (runningServers.has(server)) {
        runningServers.delete(server);
        server.stop(true);
      }
    },
  };
}

async function followChain(
  client: TestClient,
  response: Response,
  maxHops: number,
): Promise<Response> {
  let current = response;
  for (let hop = 0; hop < maxHops; hop += 1) {
    if (![301, 302, 303, 307, 308].includes(current.status)) return current;
    const location = current.headers.get("location");
    if (location === null) return current;
    current = await client.fetch(location);
  }
  throw new Error(`follow(): exceeded ${maxHops} redirects`);
}

/** Stops every server started via `startTestServer` (afterAll safety net). */
export function stopAllTestServers(): number {
  let stopped = 0;
  for (const server of runningServers) {
    server.stop(true);
    stopped += 1;
  }
  runningServers.clear();
  return stopped;
}

/** Runs `fn` with a real server, guaranteeing teardown even on failure. */
export async function withRealServer<T>(
  target: App | RouteModule | TestClientTarget,
  fn: (server: TestServer) => Promise<T> | T,
  options: TestClientOptions & { readonly port?: number } = {},
): Promise<T> {
  const server = startTestServer(target, options);
  try {
    return await fn(server);
  } finally {
    server.stop();
  }
}
