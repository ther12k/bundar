# HTMX migration guide (htmx 2 → htmx 4 beta)

How to evaluate and execute a dialect switch safely. htmx **4 is
experimental** (pinned to **4.0.0-beta6**) — no GA compatibility claim
is made or implied anywhere in Bundar, and GA revalidation is a
mandatory future gate (M7). Migration is audit-first, dual-lane-tested,
and reversible.

## The procedure (required order)

### 1. Audit before touching anything

```bash
bun run htmx:audit .                 # human report
bun run htmx:audit -- --format=json . --fail-on=review   # strict CI gate
```

`bundar htmx-audit` classifies findings:

- **blocking** — hand-written renamed headers (v4 sends the trigger
  under a different header name), `json-enc` (unsupported in v4). Fix
  these before switching; blocking findings fail the default gate.
- **review** — approximate event mappings (`htmx:historyRestore`),
  implicit-inheritance reliance (the v2 inherited-attribute set),
  error-swap assumptions (v2 swaps error bodies by default; the beta
  does not), history manipulation, CDN scripts, raw adapter escapes.
- **informational** — version-pinned asset references.

Suppression is explicit and auditable (`// bundar-audit-ignore: <rule>`
on the line or above it); suppressed findings stay in the JSON report
with the suppression's location. The tool never rewrites source.

### 2. Clear blockers mechanically

Blocking findings map to neutral helpers: hand-written header names →
`buildHtmxRequestHeaders`; `json-enc` forms → a Standard Schema JSON
path or plain form encoding. Raw protocol strings in application code
are a frozen-boundary violation anyway
(`bun run htmx:source-diff` catches them).

### 3. Run BOTH lanes from unchanged source

The reference contract: the application source is identical across
dialects; only bootstrap changes.

```bash
bun run test:example -- todo:htmx2   # stable lane
bun run test:example -- todo:htmx4   # experimental lane (dialect.ts swap only)
bun run test:example -- todo:no-js   # the no-JS lane never regresses
```

Both lanes must pass BEFORE any default change. The htmx4 lane's
harness enforces that only `src/dialect.ts` differs from the checked-in
source (a recursive diff) — if your app needs more than bootstrap
changes to run under v4, stop: that's a compatibility finding, not a
migration step.

### 4. Switch the default (bootstrap only)

```ts
// src/dialect.ts — the ONE change
import { htmx4Experimental } from "@bundar/htmx/4";
export const dialect = htmx4Experimental; // 4.0.0-beta6 — experimental
```

Nothing else changes: assets, negotiation, actions, OOB intents, and
errors all flow through the adapter.

### 5. Rollback

Revert `src/dialect.ts` to `htmx2` and redeploy. Because the switch was
bootstrap-only (step 3 enforced it), rollback is exactly one file —
no data migrations, no protocol drift. The audit trail (step 1's
committed report + lane results) tells you what was verified at each
point.

## Known divergences to review (from the pinned profiles)

| Area | htmx 2.0.10 (stable) | htmx 4.0.0-beta6 ⚠️ |
| --- | --- | --- |
| Trigger request header | canonical name | renamed (adapter alias data) |
| Error-status swaps | into target by default | not swapped by default |
| `htmx:historyRestore` | exact mapping | approximate [provisional] |
| Implicit inheritance | full v2 set | changed — set explicit `hx-inherit` |
| `json-enc` / `response-targets` | native | unsupported |
| SSE / WebSocket extensions | native | emulated |
| Cache-control directives | native | unsupported |

The generated [compatibility matrix](../compatibility/matrix.md) is the
authoritative feature table; the [API reference](../api/htmx.md)
carries the adapter's pinned version and integrity hash.

## What would GA change?

GA revalidation (M7) re-runs the dual-lane matrix against the released
htmx 4, diffs the beta adapter against the GA contract, and only then
may experimental labels be revisited — per-issue, with evidence.
Until then: **beta is beta.** Do not ship the experimental dialect as a
default in production without accepting that risk explicitly.
