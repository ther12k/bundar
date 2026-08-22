# Getting started with Bundar

Bundar is a Bun-native, HTML-first TypeScript framework: server-only JSX,
official htmx behind dialect adapters, and progressive enhancement as the
default path — your forms work without JavaScript and get better with it.

This guide is a working walkthrough: every code block is tested in CI
(see `tests/docs/guides.test.ts`), and the two reference applications —
[`examples/todo`](examples/todo.md) and
[`examples/admin-crud`](examples/admin.md) — are executable sources for
everything shown here.

## 1. Create and run your first app

> **Alpha note:** @bundar packages are not yet on the npm registry
> (publication is M6). Until then generate inside the Bundar monorepo,
> or copy `templates/minimal` (the canonical starter).

```bash
bunx create-bundar my-app --dialect htmx2   # generate (alpha: run inside the monorepo)
cd my-app && bun install
bun run dev      # hot reload: bun --hot src/main.ts
```

The smallest coherent app is five files — see
[the minimal starter](templates/minimal/README.md) for each file's exact
purpose. `bun run dev` reloads edited modules in the same process; syntax
errors keep the last-good code serving until you fix them.

## 2. Routing and pages

Routes are registered on an `App` and compiled to Bun.serve's native
route tables:

<!-- snippet: getting-started-routing -->
```ts
import { App, text } from "@bundar/core";

export const app = new App();
app.get("/healthz", () =>
  text("ok", { headers: { "cache-control": "no-store" } }),
);
```

Named routes get typed URL builders (`urls.health()` below) — renaming a
route fails `routes:check` at build time, never at runtime.

## 3. Layouts, fragments, and the no-JS main path

One handler serves BOTH browser modes. Ordinary requests receive a full
document; enhanced (htmx) requests receive the fragment — the same
business code:

<!-- snippet: getting-started-view -->
```ts
import { view } from "@bundar/htmx";
import { jsx, document } from "@bundar/jsx";
import type { App } from "@bundar/core";

export function register(app: App): void {
  app.get("/items", (context) =>
    view(context.request, {
      fragment: () => jsx("ul", { id: "items", children: "fragment" }),
      layout: (content) =>
        document({
          lang: "en",
          title: "Items",
          children: jsx("main", { children: content }),
        }),
    }),
  );
}
```

Test both modes from one fixture — no port needed:

<!-- snippet: getting-started-test -->
```ts
import { createTestClient } from "@bundar/testing";
import { app } from "./getting-started-routing";
import { register } from "./getting-started-view";

register(app);
const client = createTestClient(app);
const document_ = await client.get("/items"); // full document
const fragment = await client.enhancedGet("/items"); // htmx fragment
```

**The no-JS fallback is not an appendix**: the subscribe form in the
starter POSTs plainly (method="post" + action) and gets a
Post/Redirect/Get response; with htmx loaded the same POST returns a
fragment. One handler set, verified in both lanes by
`bun run test:example -- todo:no-js`.

## 4. Forms with validation — the main path, both worlds

`runFormAction` runs parse → validate → act with identical rules for
every browser:

<!-- snippet: getting-started-form -->
```ts
import type { App } from "@bundar/core";
import { runFormAction } from "@bundar/htmx";

const titleSchema = {
  "~standard": {
    version: 1 as const,
    vendor: "guide",
    validate: (value: unknown) => {
      const record = value as Record<string, unknown>;
      const title = typeof record["title"] === "string" ? record["title"] : "";
      return title.trim().length >= 2
        ? { value: { title: title.trim() } }
        : { issues: [{ message: "too short", path: ["title"] }] };
    },
  },
};

export function registerForm(app: App): void {
  app.post("/subscribe", (context) =>
    runFormAction(context, {
      schema: titleSchema,
      action: {
        fragment: (out: { title: string }) => out.title,
        redirectTo: "/",
      },
      renderForm: () => "",
    }).then((outcome) => outcome.response),
  );
}
```

Invalid input re-renders at 422 with the field error — the user keeps
typing; valid input redirects (no-JS) or swaps (enhanced). The full
pattern with retained values lives in
[`examples/todo/src/app.ts`](https://github.com/ther12k/bundar/blob/main/examples/todo/src/app.ts).

## 5. Security in the main path

Sessions, CSRF, and security headers are one composition — shown as the
default way to build, not an add-on (see the
[security guide](guides/security.md)):

<!-- snippet: getting-started-security -->
```ts
import type { App } from "@bundar/core";
import { createMemorySessionStore, sessionMiddleware } from "@bundar/security";

export function attachSessions(app: App): void {
  // tests/single-process demos only — production uses a durable store
  app.use(sessionMiddleware({ store: createMemorySessionStore() }));
}
```

Every mutation goes through the CSRF-scoped action group with
session-bound synchronizer tokens; tokenless submissions fail closed
403. The [Todo walkthrough](examples/todo.md) documents the full
composition contract.

## 6. Test, build, deploy

```bash
bun run typecheck && bun test          # in-process, both modes
bun run build                          # bun build → dist
bun start                              # production: bun src/main.ts
```

Production runs the entry directly — no bundler server, no dev
behaviors. The app owns its error boundary (opaque 500s in production;
see the [architecture guide](guides/architecture.md)).

## 7. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `dev: no entry found` | Pass `--entry <file>` or create `src/app.ts`. |
| 403 on form POST | Missing CSRF token/origin — pages issue session-bound tokens; re-render the form after every state change (rotation). |
| 422 with field errors | Validation worked as designed — check `renderForm`'s error slot. |
| Enhanced request returns a document | The request lacked htmx metadata — use `client.enhancedGet/…` in tests, real htmx in browsers. |
| Fragment cached wrongly | Fragments fail safe to `no-store` unless a cache policy is applied deliberately. |
| EADDRINUSE after tests | `startTestServer`/`stopAllTestServers` guarantee teardown — check custom `Bun.serve` calls. |

## Where to go next

- [Architecture guide](guides/architecture.md) — packages, boundaries,
  and when NOT to use Bundar.
- [Security guide](guides/security.md) — sessions, CSRF, headers, CSP.
- [HTMX migration guide](guides/htmx-migration.md) — auditing and
  switching dialects (htmx 4 is experimental; never assumed GA).
- [API reference](api/README.md) — every public export.
