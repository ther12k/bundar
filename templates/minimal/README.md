# Bundar minimal starter

The smallest coherent Bundar application — nothing hidden in generated
magic. Exact file purposes:

| File | Purpose |
| --- | --- |
| `src/dialect.ts` | The ONE dialect decision (bootstrap-time only). Switching htmx 2 ↔ 4 beta changes only this file. |
| `src/app.ts` | Routes: home (view-negotiated), health, and the progressive subscribe form (`runFormAction`: identical validation for no-JS PRG and htmx fragments). |
| `src/layout.tsx` | The document layout: nav, content/error region, local htmx asset script. |
| `src/main.ts` | Production bootstrap; the app owns its error boundary. |
| `src/routes.gen.ts` | GENERATED typed URL builders (`urls.home()`…) — `bun run routes:check` fails loudly on drift. |
| `src/app.test.ts` | Both browser modes + validation from one @bundar/testing client. |

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
