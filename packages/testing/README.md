# @bundar/testing

Bundar's in-process test client and request helpers (GH-074). Application
routes are tested with standards-based `Request`/`Response` objects — no
network port — unless a real-server integration case opts in.

- Purpose: `createTestClient(app)` matches and dispatches the app's compiled
  route table in-process; `startTestServer(app)` is the real ephemeral-port
  opt-in. Both return the same client interface.
- Boundaries: consumes public package APIs only (`@bundar/core`,
  `@bundar/htmx`); no production package imports this one
  (`engineering/repository-layout.md`).

## Surface

| Export | Purpose |
| --- | --- |
| `createTestClient(app \| module \| compiled, opts)` | In-process client: `get/post/…`, `submitForm`, `submitMultipart`, `submitJson`, `enhancedGet`, `enhancedSubmitForm`, `follow`, `fetch`, `jar`, `dispose` |
| `inject(target, request)` | One-shot in-process request |
| `startTestServer(app, opts)` | Real ephemeral server; same client interface over the transport |
| `withRealServer(app, fn)` / `stopAllTestServers()` | Guaranteed teardown; suite-level safety net |
| `formRequest` / `jsonRequest` / `multipartRequest` / `fileFixture` | Request builders for forms, JSON, and multipart uploads |
| `enhancedRequest(path, { dialect, htmx })` | Enhanced (HTMX) requests with dialect-correct headers — names come from `@bundar/htmx`, never hand-written |
| `CookieJar` / `responseCookies` | Cookie semantics: last-write-wins absorption, clearing, replay header |
| `matchRoute` / `requestWithParams` | The supported-subset route matcher (exact, `:param`, `*`) |

## In-process vs real-server semantics

Deliberate, documented differences:

- **Route matching** — in-process uses the supported-subset matcher
  (exact paths, `:param`, `*` tails; 405 mirrors Bun). Bun.serve's native
  matching only applies on the real transport.
- **Uncaught handler errors** — the in-process client REJECTS the call when
  no `error` hook is compiled in, so tests see failures directly.
  `startTestServer` wires Bun's default opaque 500 explicitly (same
  observable answer, no uncaught-error console noise).
- **Redirects** — `follow()` implements the PRG pattern (3xx → GET the
  location). 307/308 also GET; the action composer emits 303 for ordinary
  submissions, so method-preserving replay is out of scope.

## Leak-safe setup/teardown

- `createTestClient` holds no OS resources; `dispose()` clears jar state.
- Every `startTestServer` registers in a module registry: `stop()` is
  idempotent, `withRealServer(fn)` guarantees teardown on failure, and
  `stopAllTestServers()` is the `afterAll` safety net.
- Each client owns an isolated jar — concurrent tests never share cookies.

## One fixture, four modes

The same app fixture serves ordinary (no-JS), htmx2, htmx4-beta, and raw
requests; see `test/client.test.ts` and `tests/consumer/testing`. Dialect
header names (htmx 4 beta aliases the trigger to `HX-Source`) come from
`buildHtmxRequestHeaders` in `@bundar/htmx`.
