/**
 * The in-process test client (GH-074).
 *
 * `createTestClient(app)` serves the app's compiled route table WITHOUT a
 * network port: requests are matched and dispatched in-process, with a
 * per-client cookie jar, redirect following, and dialect-aware enhanced
 * requests. `startTestServer` (./server) is the real-server opt-in for
 * Bun-specific integration cases; both share this interface so a fixture
 * can switch transports without rewriting assertions.
 *
 * In-process semantics differ from Bun.serve deliberately and visibly:
 * route matching is the supported-subset matcher (./match), and a thrown
 * handler error REJECTS the call when no `error` hook is configured —
 * tests see failures instead of Bun's default 500 page. With a hook, the
 * hook's response mirrors the server.
 *
 * `follow()` implements the PRG pattern (301/302/303 → GET the location).
 * 307/308 also fetch the location with GET — the actions composer emits
 * 303 for ordinary submissions, so method-preserving replay is out of
 * scope and documented here.
 */
import { compileRoutes, App } from "@bundar/core";
import type { CompiledServerOptions, RouteModule } from "@bundar/core";
import { buildHtmxRequestHeaders } from "@bundar/htmx";
import type {
  HtmxDialectAdapter,
  HtmxRequestHeaderOptions,
} from "@bundar/htmx";
import { CookieJar } from "./cookies";
import { matchRoute, requestWithParams } from "./match";
import {
  enhancedRequest,
  formRequest,
  jsonRequest,
  multipartRequest,
  TEST_ORIGIN,
  type MultipartPart,
  type RequestInitLike,
} from "./request";

export type TestClientTarget = App | RouteModule | CompiledServerOptions;

export interface TestClientOptions {
  /** Default dialect for `enhanced*` calls; neutral headers when omitted. */
  readonly dialect?: HtmxDialectAdapter;
  /** Cookie-jar handling; disable to assert raw Set-Cookie behavior. */
  readonly cookies?: boolean;
  /** Extra compile options forwarded for App/RouteModule targets. */
  readonly compile?: Parameters<App["compile"]>[0];
}

export interface TestClient {
  readonly mode: "in-process" | "real-server";
  readonly url: string;
  readonly jar: CookieJar;
  readonly dialect?: HtmxDialectAdapter;
  fetch(input: Request | string): Promise<Response>;
  get(path: string, init?: RequestInitLike): Promise<Response>;
  post(path: string, init?: RequestInitLike): Promise<Response>;
  put(path: string, init?: RequestInitLike): Promise<Response>;
  patch(path: string, init?: RequestInitLike): Promise<Response>;
  delete(path: string, init?: RequestInitLike): Promise<Response>;
  head(path: string, init?: RequestInitLike): Promise<Response>;
  submitForm(
    path: string,
    fields: Record<string, string>,
    init?: RequestInitLike,
  ): Promise<Response>;
  submitMultipart(
    path: string,
    parts: Record<string, MultipartPart>,
    init?: RequestInitLike,
  ): Promise<Response>;
  submitJson(
    path: string,
    value: unknown,
    init?: RequestInitLike,
  ): Promise<Response>;
  /** Enhanced (HTMX) GET with dialect-correct headers. */
  enhancedGet(
    path: string,
    htmx?: HtmxRequestHeaderOptions,
    init?: RequestInitLike,
  ): Promise<Response>;
  /** Enhanced (HTMX) form POST with dialect-correct headers. */
  enhancedSubmitForm(
    path: string,
    fields: Record<string, string>,
    htmx?: HtmxRequestHeaderOptions,
    init?: RequestInitLike,
  ): Promise<Response>;
  /** Follows a 3xx chain by GETting each location (PRG pattern). */
  follow(response: Response, maxHops?: number): Promise<Response>;
  /** Releases jar state; a no-op beyond that for in-process clients. */
  dispose(): void;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function isApp(target: TestClientTarget): target is App {
  return target instanceof App;
}

function isRouteModule(target: TestClientTarget): target is RouteModule {
  return (
    typeof target === "object" &&
    target !== null &&
    "routes" in target &&
    !("fetch" in target)
  );
}

/** Compiles any supported target into the server-options shape once. */
export function compileForTest(
  target: TestClientTarget,
  options: TestClientOptions = {},
): CompiledServerOptions {
  if (isApp(target)) {
    return options.compile === undefined
      ? target.compile()
      : target.compile(options.compile);
  }
  if (isRouteModule(target)) {
    return compileRoutes(
      target.routes,
      options.compile as Parameters<typeof compileRoutes>[1],
    );
  }
  return target;
}

function absolutize(input: Request | string): Request {
  return input instanceof Request
    ? input
    : new Request(`${TEST_ORIGIN}${input}`);
}

function withCookieHeader(
  request: Request,
  cookieHeader: string,
): Promise<Request> {
  const headers = new Headers(request.headers);
  headers.set("cookie", cookieHeader);
  if (request.method === "GET" || request.method === "HEAD") {
    return Promise.resolve(
      new Request(request.url, { method: request.method, headers }),
    );
  }
  return request
    .clone()
    .arrayBuffer()
    .then(
      (body) =>
        new Request(request.url, {
          method: request.method,
          headers,
          body,
        }),
    );
}

export function createTestClient(
  target: TestClientTarget,
  options: TestClientOptions = {},
): TestClient {
  const compiled = compileForTest(target, options);
  const jar = new CookieJar();
  const useJar = options.cookies !== false;
  const { dialect } = options;

  const dispatch = async (incoming: Request): Promise<Response> => {
    const request =
      useJar && jar.size > 0
        ? await withCookieHeader(incoming, jar.header())
        : incoming;

    const url = new URL(request.url);
    const match = matchRoute(compiled, request.method, url.pathname);
    if (match.kind === "not-found") {
      const response = await compiled.fetch(request);
      if (useJar) jar.absorb(response);
      return response;
    }
    if (match.kind === "method-not-allowed") {
      return new Response(null, {
        status: 405,
        headers: { allow: match.allowed.join(", ") },
      });
    }

    if (match.entry instanceof Response) {
      // BR-073 review: static entries are SHARED objects in the compiled
      // table — hand each caller its own clone so one consumer reading the
      // body cannot poison the next request.
      const response = match.entry.clone() as Response;
      if (useJar) jar.absorb(response);
      return response;
    }

    try {
      const result = (match.entry as (request: Request) => unknown)(
        requestWithParams(request, match.params),
      );
      const response = await Promise.resolve(result as Response);
      if (useJar) jar.absorb(response);
      return response;
    } catch (error) {
      if (compiled.error !== undefined) {
        const response = await compiled.error(error as Error);
        if (useJar) jar.absorb(response);
        return response;
      }
      // In-process semantics: no hook → surface the failure to the test.
      throw error;
    }
  };

  const enhancedHeadersOf = (
    htmx: HtmxRequestHeaderOptions | undefined,
  ): Record<string, string> => buildHtmxRequestHeaders(htmx ?? {}, dialect);

  const client: TestClient = {
    mode: "in-process",
    url: TEST_ORIGIN,
    jar,
    ...(dialect !== undefined ? { dialect } : {}),
    fetch: (input) => dispatch(absolutize(input)),
    get: (path, init = {}) =>
      dispatch(enhancedRequest(path, { ...init, method: "GET" })),
    post: (path, init = {}) =>
      dispatch(enhancedRequest(path, { ...init, method: "POST" })),
    put: (path, init = {}) =>
      dispatch(enhancedRequest(path, { ...init, method: "PUT" })),
    patch: (path, init = {}) =>
      dispatch(enhancedRequest(path, { ...init, method: "PATCH" })),
    delete: (path, init = {}) =>
      dispatch(enhancedRequest(path, { ...init, method: "DELETE" })),
    head: (path, init = {}) =>
      dispatch(enhancedRequest(path, { ...init, method: "HEAD" })),
    submitForm: (path, fields, init = {}) =>
      dispatch(formRequest(path, fields, init)),
    submitMultipart: (path, parts, init = {}) =>
      dispatch(multipartRequest(path, parts, init)),
    submitJson: (path, value, init = {}) =>
      dispatch(jsonRequest(path, value, init)),
    enhancedGet: (path, htmx, init = {}) =>
      dispatch(
        enhancedRequest(path, {
          ...init,
          method: "GET",
          dialect,
          htmx: htmx ?? {},
        }),
      ),
    enhancedSubmitForm: (path, fields, htmx, init = {}) =>
      dispatch(
        formRequest(path, fields, {
          ...init,
          headers: {
            ...((init.headers as Record<string, string> | undefined) ?? {}),
            ...enhancedHeadersOf(htmx),
          },
        }),
      ),
    follow: (response, maxHops = 5) =>
      followRedirects(client, response, maxHops),
    dispose: () => {
      jar.clear();
    },
  };
  return client;
}

async function followRedirects(
  client: TestClient,
  response: Response,
  maxHops: number,
): Promise<Response> {
  let current = response;
  for (let hop = 0; hop < maxHops; hop += 1) {
    if (!REDIRECT_STATUSES.has(current.status)) return current;
    const location = current.headers.get("location");
    if (location === null) return current;
    current = await client.fetch(location);
  }
  throw new Error(`follow(): exceeded ${maxHops} redirects`);
}

/** One-shot in-process request; compiles the target once per call. */
export function inject(
  target: TestClientTarget,
  request: Request | string,
): Promise<Response> {
  return createTestClient(target).fetch(request);
}
