/**
 * The in-process test client (GH-074 / BR-092).
 *
 * `createTestClient(app)` serves the app's compiled route table WITHOUT a
 * network port: requests are matched and dispatched in-process, with a
 * per-client cookie jar, redirect following, and dialect-aware enhanced
 * requests. `startTestServer` (./server) is the real-server opt-in for
 * Bun-specific integration cases; both share this interface so a fixture
 * can switch transports without rewriting assertions.
 *
 * In-process semantics match Bun.serve closely:
 * - Route matching adheres to native category precedence (exact > parameter > wildcard > catch-all)
 * - HEAD requests strip body while preserving GET status and headers
 * - Cookie jar respects Path, Domain, Secure, and Expires/Max-Age
 * - Redirect following preserves HTTP method and body on 307/308, and switches to GET on 301/302/303 (PRG)
 * - Thrown handler errors REJECT when no `error` hook is configured; with a hook, the hook's response is returned.
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
  /** Follows a 3xx chain (301/302/303 -> GET; 307/308 -> preserves method & body). */
  follow(response: Response, maxHops?: number): Promise<Response>;
  /** Releases jar state; a no-op beyond that for in-process clients. */
  dispose(): void;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
export const responseRequestMap = new WeakMap<Response, Request>();

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

function stripBody(response: Response): Response {
  // HTTP semantics: HEAD responses carry GET-equivalent headers with NO body.
  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
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
        ? await withCookieHeader(incoming, jar.header(incoming.url))
        : incoming;

    const record = (res: Response): Response => {
      responseRequestMap.set(res, incoming);
      if (useJar) jar.absorb(res, incoming.url);
      return res;
    };

    const url = new URL(request.url);
    const match = matchRoute(compiled, request.method, url.pathname);
    if (match.kind === "not-found") {
      let response = await compiled.fetch(request);
      if (request.method === "HEAD") {
        response = stripBody(response);
      }
      return record(response);
    }
    if (match.kind === "method-not-allowed") {
      return record(
        new Response(null, {
          status: 405,
          headers: { allow: match.allowed.join(", ") },
        }),
      );
    }

    const optionsAllow = match.optionsResponse;
    if (optionsAllow !== undefined) {
      // Auto-OPTIONS policy parity: 204 + deterministic Allow.
      return record(
        new Response(null, {
          status: 204,
          headers: { allow: optionsAllow },
        }),
      );
    }
    if (match.entry instanceof Response) {
      // BR-073 review: static entries are SHARED objects in the compiled
      // table — hand each caller its own clone so one consumer reading the
      // body cannot poison the next request.
      const response =
        request.method === "HEAD"
          ? stripBody(match.entry.clone() as Response)
          : (match.entry.clone() as Response);
      return record(response);
    }

    try {
      const result = (match.entry as (request: Request) => unknown)(
        requestWithParams(request, match.params),
      );
      let response = await Promise.resolve(result as Response);
      if (request.method === "HEAD") {
        response = stripBody(response);
      }
      return record(response);
    } catch (error) {
      if (compiled.error !== undefined) {
        let response = await compiled.error(error as Error);
        if (request.method === "HEAD") {
          response = stripBody(response);
        }
        return record(response);
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
      followRedirects(
        client,
        response,
        responseRequestMap.get(response),
        maxHops,
      ),
    dispose: () => {
      jar.clear();
    },
  };
  return client;
}

async function followRedirects(
  client: TestClient,
  initialResponse: Response,
  initialRequest: Request | undefined,
  maxHops: number,
): Promise<Response> {
  let currentResponse = initialResponse;
  let currentRequest = initialRequest;
  for (let hop = 0; hop < maxHops; hop += 1) {
    if (!REDIRECT_STATUSES.has(currentResponse.status)) return currentResponse;
    const location = currentResponse.headers.get("location");
    if (location === null) return currentResponse;

    const status = currentResponse.status;
    const base = currentRequest ? currentRequest.url : client.url;
    const targetUrl = new URL(location, base).toString();

    let nextRequest: Request;
    if (status === 307 || status === 308) {
      // Preserve method and body
      const method = currentRequest ? currentRequest.method : "GET";
      const headers = new Headers(currentRequest?.headers);
      let body: ArrayBuffer | undefined;
      if (currentRequest && method !== "GET" && method !== "HEAD") {
        body = await currentRequest.clone().arrayBuffer();
      }
      nextRequest = new Request(targetUrl, {
        method,
        headers,
        body,
      });
    } else {
      // 301, 302, 303: PRG pattern -> GET
      nextRequest = new Request(targetUrl, {
        method: "GET",
      });
    }
    currentRequest = nextRequest;
    currentResponse = await client.fetch(nextRequest);
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
