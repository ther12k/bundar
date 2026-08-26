# Evidence wave — regression tests for #145 / #147 / #148 / #149 (BR-093/095/096/097)

Branch `gh-evidence-regression-tests` off main `f6380f1`. The audit rule
adopted by the repository: an issue closes only on the exact committed
tree WITH passing regression tests. The source fixes for these four
findings landed in commit `1126876` (second re-review correction wave)
but without dedicated tests; this branch pins each behavior so closure
is evidence-backed.

## Per-issue mapping

| Issue | Behavior pinned | Test file |
| --- | --- | --- |
| #149 BR-097 | PROBE debug removed: no `process.env.PROBE`, no ad-hoc `console.error(...)` branches in `packages/core/src/**` (guard test over all sources) | `packages/core/test/routing/probe-guard.test.ts` |
| #147 BR-095 | duplicate `:param` names rejected (`normalizeRoutePath` direct + at compile); wildcard routes cannot carry `meta.name` (RouteConflictError w/ guidance); hostile route name (backtick/newline/`${}`/quote) generated module round-trips via real import and missing-param errors stay escaped | `packages/core/test/routing/codegen-hardening.test.ts` |
| #148 BR-096 | native plain-Bun.serve fixture pins param>wildcard dispatch INDEPENDENT of static-segment count (audit counterexample); unregistered method lands in plain fetch → 404 (no Allow natively); Bundar fallback answers PUT/OPTIONS from the PARAMETER group on the counterexample; live-server test proves Bun.serve picks "param" over more-static wildcard AND still serves the wildcard's own POST below it; 4-row structural corpus asserts category-first Allow/OPTIONS in every case; late-registered wildcard cannot shadow earlier param | `packages/core/test/http-methods/fallback-precedence.test.ts` |
| #145 BR-093 | shared `validateCookieAttributes` contract (SameSite=None⇒Secure; `__Host-` ⇒ Secure+Path=/+no Domain); sessionMiddleware runs it AT CONSTRUCTION (`__Host-…` with secure:false throws CookiePolicyError before production posture runs) | `packages/security/test/session/cookie-construction.test.ts` |

## Commands and results (exact tree f6380f1 + this branch)

- New tests: 25 (11 precedence + 7 codegen + 1 guard + 6 cookie), all pass.
- Focused files: 59 pass / 0 fail across 9 files.
- Full suite: **1140 pass / 0 fail** across 144 files (was 1115 before wave).
- `tsc --noEmit -p tsconfig.json`: exit 0.
- `eslint .`: exit 0. Prettier check: clean.

Two product-behavior discoveries made while writing the tests
(documented here, not worked around):

1. `compiled.fetch` is ONLY the 404/405 fallback — full request dispatch
   happens through a real `Bun.serve(app.serve())` (GH-015 design). The
   counterexample's reachability assertions therefore run against a live
   server from the SAME app under test.
2. A path that structurally matches ONLY the wildcard (extra segments
   beyond every :param) correctly reports the wildcard group's Allow —
   the corpus keeps its expectations tied to which groups actually match
   the request path.

## Acceptance criteria status

- #147: [x] duplicate params rejected with clear error · [x] wildcard named routes rejected with guidance · [x] generated sources survive hostile names (round-trip import).
- #148: [x] native fixture pins fallback/precedence on the counterexample · [x] fallback selects the same group as native across corpus · [x] Allow/OPTIONS computed from the correct group in every corpus case.
- #149: [x] no PROBE/ad-hoc console.error branches in packages/core/src · [x] none reintroduced silently (guard fails otherwise).
- #145: [x] validator runs at construction with clear startup diagnostics (test proves ordering ahead of posture checks) · shared validator contract unit-pinned.
