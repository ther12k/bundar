# GH-049 verification transcript — cache variation and history safety policy

## Issue

[GH-049 — Implement cache variation and history safety
policy](../../issues/m3/gh-049-implement-cache-variation-and-history-safety-policy.md)
(branch `gh-049-cache-history`, worktree `bundar-gh-049`, base commit
`ab23e28` = main after the GH-038 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/htmx `0.0.0` with pinned dialect profiles htmx `2.0.10` (stable)
  and `4.0.0-beta6` (experimental; never claimed GA).
- Browser: Chrome for Testing `152.0.7977.8` / Playwright Chromium `1237`.
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `packages/htmx/src/cache-policy.ts` (new): `mergeVary` (lossless,
  case-insensitive, order-preserving composition), `cachePolicyFor`
  (fail-safe defaults: full negotiation Vary + `no-store`; validated
  opt-ins `sMaxage`/`maxAge`; `private` never combines with shared caching
  and `max-age` may not exceed `s-maxage` — violations throw
  `CachePolicyError`), `applyCachePolicy` (Vary merged; Cache-Control set
  only when the handler did not set one — explicit overrides survive),
  `historyPolicyFor` (explicit per-dialect facts read from the pinned
  profiles: restore header, push-url default, the htmx 4 beta's provisional
  history-cache-rework note surfaced as a policy note), and
  `CACHE_VARY_HEADERS`.
- Tests: `packages/htmx/test/cache/cache-policy.test.ts` (10) and
  `tests/proxy-cache/{simulated-proxy.ts,poisoning.test.ts}` (5) — the
  simulated proxy cache stores per-URL representations keyed on Vary field
  values captured from the storing request, refuses `no-store`/`private`,
  and the fixtures prove: all four negotiation variants coexist and serve
  correctly; MISSING Vary reproduces the poisoning risk (single body for
  all variants — documented, not hidden); a partial Vary carries a residual
  risk the full policy Vary avoids; private/default responses never stored.
- `tools/security/cache-audit.ts` + `security:cache` script: fail-closed
  audit of all six property groups with a committed artifact.
- Browser lanes: the negotiation-fetch eval now asserts the exact Vary
  string on BOTH representations, and a real history-restore scenario runs
  after the boosted navigation — back to the pushing page, forward through
  htmx's restore (cache or `HX-History-Restore-Request` refetch), asserting
  the DOCUMENT is installed (one html root, one body, #items present).
  Hard-asserted on the stable lane; the experimental lane records the
  observation (its profile documents the provisional history rework) — and
  passed.
- `packages/htmx/README.md`: cache/history section.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun test packages/htmx/test/cache/**` (+ proxy fixtures) — exit 0; 15
   tests, 43 expect() calls, 0 fail.
3. `bun run security:cache` — exit 0 (six property groups; artifact
   `evidence/gh-049/cache-audit.json`).
4. `bun run test:browser:htmx2` / `htmx4` — exit 0; both lanes pass the
   new history-restore scenario (`output/playwright/*/history-restore.json`
   shows url /page-fragment, one html root, items restored) and the Vary
   assertions.
5. `bun run test:browser:report` — exit 0.
6. `bun run --filter @bundar/htmx typecheck` and root `bun run typecheck` —
   exit 0.
7. `bun run lint`, `bun run format:check` — exit 0.
8. `bun test` (full) — exit 0; 531 tests across 66 files, 0 fail, 7,513
   expect() calls.
9. `bun run architecture:check` — exit 0 (63 source files). `bun run
   pack:inspect @bundar/htmx` — exit 0. `bun run build` — exit 0.
   `bun run docs:validate` (213 documents) / `docs:links` (1,119 links) —
   exit 0.

### Tooling decisions

- The planned `bun run test:browser:dual -- history` runner does not exist;
  the history-restore scenario was added to BOTH existing lanes (hard
  assertion on the stable htmx 2 lane; recorded observation on the
  experimental htmx 4 lane per the established policy) — dual-lane
  coverage, same substitution pattern as GH-048/061/062.
- `security:cache` was added verbatim as the planned audit command.

## Acceptance evidence mapping

- "Page and fragment variants never overwrite each other in the test
  cache" — coexistence fixture (2 variants) and the four-variant fixture
  (doc/frag/boosted/restore), asserted per-variant lookups.
- "Existing Vary values are merged without loss" — mergeVary unit tests +
  applyCachePolicy with a pre-set `Vary: Cookie`.
- "Authenticated/private responses remain private unless explicitly
  overridden" — private policies never stored by the simulator; explicit
  handler Cache-Control overrides survive applyCachePolicy.
- "History restore scenarios pass in both lanes or are capability-gated" —
  the restore scenario passed in BOTH lanes; the policy exposes the
  capability gate (`restoreRequestHeader: null` path) for dialects without
  the header.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0; nothing skipped; the
  poisoning risk is REPRODUCED as documentation rather than hidden.
- OKF/log updates — htmx README section, closure record below,
  `issues/m3/index.md`, `log.md`, this transcript, audit artifact.

## Residual risks

- A partial Vary (handler-supplied, narrower than the policy's) keeps a
  residual poisoning window — demonstrated and documented; the fix is
  always using the policy's full Vary.
- The simulated proxy is deliberately minimal (Vary matching + store/refuse
  semantics), not a CDN model; real CDNs add their own keys (e.g.
  Accept-Encoding) beyond this contract.
- The htmx 4 beta's history internals are provisional per its pinned
  profile; the experimental lane records observations until GA
  revalidation (GH-089+).

## Newly unblocked

- None directly (blocks nothing in the graph); strengthens GH-050/051/053/
  054/055 built on top of view()/negotiation.
