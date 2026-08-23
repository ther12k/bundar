# Bundar minimal starter

The smallest coherent Bundar application — nothing hidden in generated
magic. Exact file purposes:

Structure follows [ADR-0019](../../decisions/0019-agent-friendly-feature-slices.md)
(feature-sliced, compact scale):

| File | Purpose |
| --- | --- |
| `src/platform/dialect.ts` | The ONE dialect decision (bootstrap-time only). Switching htmx 2 ↔ 4 beta changes only this file. |
| `src/app.ts` | Composition only: health + asset wiring, feature route registration. |
| `src/layout.tsx` | The document layout: nav, content/error region, local htmx asset script. |
| `src/features/subscribe/subscribe.routes.tsx` | HTTP/HTMX orchestration: home view + progressive form (`runFormAction`: identical validation for no-JS PRG and htmx fragments). |
| `src/features/subscribe/subscribe.schema.ts` | The input validation contract (Standard Schema v1). |
| `src/features/subscribe/subscribe.types.ts` | Domain types for the feature. |
| `src/features/subscribe/subscribe.view.tsx` | Real-TSX views: form (with retained values + error region) and success fragment. |
| `src/main.ts` | Production bootstrap; the app owns its error boundary. |
| `src/routes.gen.ts` | GENERATED typed URL builders (`urls.home()`…) — `bun run routes:check` fails loudly on drift. |
| `src/app.test.ts` | Both browser modes + validation from one @bundar/testing client. |

Boundary gate: \`bun run app:arch\` enforces the dependency direction
(views never import actions; actions never touch HTTP/UI).

## Run

```bash
bun install
bun run dev        # hot reload development
bun run typecheck && bun test && bun run build
bun start          # production
```

The subscribe form works with JavaScript disabled (Post/Redirect/Get) and
with htmx (fragment swap) from the same handlers. The htmx asset is
served locally from the framework's pinned vendor file — no CDN, no
demo credentials, no fake production data.
