# Bundar Design Update Log

## 2026-08-21 — Initial complete design and delivery bundle

- Selected **Bundar** as the working public brand, subject to namespace and legal clearance.
- Defined the Bun-native, server-only JSX, HTML-first product boundary.
- Made htmx support a replaceable dialect adapter rather than a core dependency.
- Recorded stable htmx 2 and experimental htmx 4 beta profiles.
- Added an explicit HTMX 4 GA revalidation and zero-application-change migration gate.
- Generated 96 GitHub-ready microtasks across eight milestones.
- Added dependency, security, conformance, benchmark, packaging, and release gates.
- Generated a bulk GitHub issue creation runbook and local validation report.

No implementation, benchmark result, security certification, package publication, namespace reservation, or HTMX 4 GA compatibility is claimed by this design event.

## 2026-08-21 — GH-001: Bun workspace and repository skeleton

- Initialized the implementation repository in place on top of the design corpus (initial commit preserves the corpus; implementation lands on per-issue branches).
- Created the Bun workspace per `engineering/repository-layout.md`: `packages/{core,jsx,htmx,schema,testing,cli}`, `create-bundar`, `examples/{minimal,todo,admin-crud}`, `fixtures/{htmx2,htmx4,cross-dialect-app}`, `benchmarks/{raw-bun,hono,bundar}`, `docs/okf`, `scripts`, `.github`. All packages are skeleton-only with no invented framework behavior.
- Pinned the toolchain: Bun `1.4.0` via `packageManager` + `engines`, runtime preflight wired to `preinstall` and CI that fails clearly on non-Bun or sub-1.4 runtimes.
- Added root `format`, `format:check`, `lint`, `typecheck`, `test`, `build`, `clean` scripts; none swallow failures.
- Added `tests/skeleton.test.ts` pinning the planned layout and the zero-runtime-dependency policy for `@bundar/core` and `@bundar/jsx`.
- Full verification battery green on Bun 1.4.0 (frozen install, format, lint, typecheck, 4/4 tests, build); transcript in `evidence/gh-001/verification-transcript.md`.
- Tooling decisions recorded: TypeScript 6.0.3 (typescript-eslint peer limit), `@types/bun` 1.3.14 (types lag runtime by one day), Prettier scope excludes the OKF Markdown corpus.
- Residual risk: the CI workflow has not run on GitHub-hosted runners yet (no remote; GH-009 configures GitHub).

No framework routing, JSX rendering, or HTMX behavior is claimed by this event.

## 2026-08-21 — GH-002: governance, licensing, security, and contribution foundations

- Added the MIT `LICENSE` (per `project/open-source-strategy.md`) and declared `"license": "MIT"` across the root and all 11 workspace manifests.
- Added `SECURITY.md` (private coordinated disclosure via GitHub private vulnerability reporting; no public zero-day path), `SUPPORT.md` (pre-alpha support expectations, no LTS promises), `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), and `MAINTAINERS.md` (ownership areas for core, JSX, HTMX adapters, security-sensitive code, and releases).
- Added `CONTRIBUTING.md` requiring issue-scoped pull requests, evidence, OKF corpus updates, and the full verification battery.
- Added `.github/CODEOWNERS` with ownership for security-sensitive and release paths (team placeholder until GH-004/GH-009).
- Implemented the issue's placeholder `bun run docs:check` as `scripts/docs-check.ts`: verifies governance file presence, license identity across manifests, private-reporting language, absence of public vulnerability issue templates, CONTRIBUTING evidence/OKF links (with link resolution), and CODEOWNERS coverage. Wired into CI.
- Verified with adversarial negative checks (removed license field detected; wrapped SECURITY.md phrase detected); full battery green; transcript in `evidence/gh-002/verification-transcript.md`.

No security certification, named-maintainer roster, or public namespace claim is made by this event.

## 2026-08-21 — GH-003: OKF documentation corpus and local validator

- Fixed the OKF v0.2 bundle location: the repository root is the bundle root (`index.md` declares `okf_version: "0.2"`; `log.md` is the reserved log); corpus = the nine design directories plus three root concepts; no duplication under `docs/okf/`, which now documents the layout.
- Implemented `tools/okf-validator/` with `docs:validate`, `docs:links`, and `issues:graph`: root metadata, reserved-file conventions, parseable frontmatter with non-empty concept types, internal link resolution, unique `GH-###` stable IDs, dependency existence, and cycle detection; frontmatter parsed with the `yaml` devDependency.
- Whole-corpus validation passes: 205 documents, 1031 links, 96 issues, 213 dependency edges, no cycles, single root GH-001 — mechanically reproducing the generated dependency ledger.
- Added adversarial unit tests plus a real-corpus integration test (14 tests total, all green); added `.github/workflows/docs.yml` to CI; extended the CONTRIBUTING battery.
- Validator output always states it is local structural validation, not external certification; transcript in `evidence/gh-003/verification-transcript.md`.

No third-party certification is claimed by this event.

## 2026-08-21 — GH-004: brand clearance record and temporary namespace policy

- Recorded automated namespace screening (2026-08-21) in ADR-0015: npm `@bundar/*`, `bundar`, `create-bundar`, and fallback `@bundarjs/*` all unpublished (registry 404); PyPI and crates.io free; `bundar.com` registered/parked, other checked domains NXDOMAIN.
- Found and recorded a hard constraint: a GitHub personal account named `Bundar` has existed since 2016, so the `bundar` organization name is permanently unavailable; the planned organization is `bundarjs` (screened available).
- Trademark position recorded honestly: web screening shows no exact "Bundar" software mark (closest: BUNDLAR, an AR platform); official database screening (USPTO/EUIPO/WIPO/DGIP) and counsel review are an announcement-gate precondition, and no search result is treated as legal advice.
- Decision: product name stays Bundar; all public identifiers are explicitly temporary and unreserved; publication gates (GH-086) must reserve and re-verify before first publish; documented migration path if the name is rejected (nothing published yet).
- Updated `project/naming-and-brand.md` safeguards and `decisions/index.md`; evidence transcript in `evidence/gh-004/verification-transcript.md`.

No namespace reservation, trademark registration, or legal opinion is claimed by this event.

## 2026-08-21 — GH-005: public API principles and package boundaries frozen (ADR-0016)

- Froze the package map and dependency direction; `@bundar/core` and `@bundar/jsx` zero-runtime-dependency policy made explicit and machine-enforced.
- Implemented `bun run architecture:check` (`tools/architecture-check/`): machine-readable boundary manifest plus a scanner enforcing cross-package import allowlists, external-dependency rejection, relative-escape detection, and confinement of raw `HX-*`/`htmx:*` strings to `@bundar/htmx`; wired into CI.
- Verified adversarially: injected violations in `@bundar/core` (dialect import, external `yaml` import, raw `HX-Request` string) are all caught with exit 1; clean tree passes.
- Added the symbol ownership map to `engineering/package-api.md` — every planned public symbol family has an owning package; nothing is silently unowned.
- Froze the handler contract (`Response | Promise<Response>` only, no second router, no hidden browser runtime), the server-only JSX boundary, the HTMX stable subset with escape hatch, forbidden dependencies, non-goals, and the pre-1.0 A/B/C API change classification with evidence requirements.
- Evidence transcript in `evidence/gh-005/verification-transcript.md`.

No public API stability claim beyond the frozen principles is made by this event; exact signatures remain deferred to owning milestone issues.

## 2026-08-21 — GH-009: GitHub labels, milestones, project fields, and automation

- Created the public GitHub repository `ther12k/bundar` project configuration: 45 labels, 8 milestones, and project `Bundar Delivery` (#3) at `https://github.com/users/ther12k/projects/3`.
- Added implementation issue and PR templates requiring stable IDs, dependency metadata, evidence, tests, security review, no-JS/dual-HTMX consideration, and OKF/log updates; public blank issues disabled and security reports routed privately.
- Added a reviewable project field/automation manifest and populated all 96 project items with stable ID, priority, area, size, dependencies, upstream flag, release gate, and evidence links for completed issues. GH-001–GH-006 are `Done`; GH-009 is `In Progress`; remaining issues are `Todo`.
- Configured six live views: Ready by milestone, Blocked and upstream-dependent, Security/P0, HTMX 4 migration, Release gate evidence, and Contributor-friendly tasks.
- Removed GitHub's unsafe default `Auto-close issue` and `Pull request merged` workflows so merged PRs cannot close issues without acceptance evidence.
- Evidence transcript in `evidence/gh-009/verification-transcript.md`; configuration mapping in `github/configuration-manifest.json`.

GH-009 implementation is complete in the live repository; its historical project setup snapshot is superseded by the GH-010 final-state audit.

## 2026-08-21 — GH-007: reproducible raw Bun and Hono benchmark harness

- Pinned Hono `4.13.3` as the Bun framework reference and added nine equivalent in-process Request/Response scenarios: static, dynamic, parameterized, sync/async middleware, escaped fragment, async component, page/fragment negotiation, and validated form.
- Added parity-before-timing checks, raw response snapshots, warmups, repetitions, nanosecond samples, min/mean/max/p50/p95/p99, standard deviation, relative standard deviation, environment metadata, and ignored artifact output.
- Added `bench:smoke`, `bench:parity`, and `bench` scripts; benchmark tests assert no localhost networking, parity, raw sample retention, and explicit Bundar deferral (`501` until M1/M2).
- Completed verification: 31 tests pass; smoke/parity/full report, format, docs, architecture, build, and frozen install all pass. Raw report and summary are in `evidence/gh-007/`.
- No performance claim or regression threshold is made. Bundar is not timed until its runtime implementation exists; observed raw Bun/Hono values are environment-specific baseline evidence only.

GH-007 is complete; the historical note above is superseded by the GH-010 gate audit below.

## 2026-08-21 — GH-008: browser conformance harness for htmx 2 and htmx 4 lanes

- Added a real Playwright CLI browser harness with a Bun ephemeral-port fixture server and one shared application source executed against pinned htmx `2.0.10` and htmx `4.0.0-beta6` assets.
- Added smoke, fragment swap, form POST, history push, request-log, DOM, screenshot, console, and trace/network evidence capture. Exact asset versions, byte counts, and SHA-256 hashes are recorded in `evidence/gh-008/report.json`.
- Added a fail-closed incorrect-header fixture. Both lanes exit nonzero with the intended missing `HX-Trigger-After-Swap` assertion; neither result is downgraded to a warning or pass.
- Stable htmx2 records `event: afterRequest`. The htmx4 beta lane records `event: none` as a separate experimental observation; this is not an htmx 4 GA compatibility claim.
- Browser verification passed: `bun run test:browser:htmx2`, `bun run test:browser:htmx4`, and `bun run test:browser:report` all exit 0. Transcript: `evidence/gh-008/verification-transcript.md`.

GH-008 is complete; GH-053 and GH-054 inherit the browser harness for their dialect-profile closure work. GH-010 supersedes the temporary “ready” state with the final gate event below.

## 2026-08-21 — GH-010: M0 contract-freeze gate

- Added the canonical fail-closed `bun run ci:m0` runner with 17 ordered steps covering Bun preflight, format/lint/typecheck, OKF and governance validation, architecture tests/checks, benchmark smoke/parity, both browser lanes/report, full tests, and build.
- Reconciled GH-006 durable architecture evidence and GH-008 acceptance checklists; the GH-009 transcript now distinguishes its historical setup snapshot from the final-state project audit.
- Added the authoritative OKF gate concept at `delivery/gates/m0.md` and linked it from `delivery/index.md`; the root `log.md` remains the reserved chronological log, so the stale `docs/okf/log.md` suggestion was not used.
- Gate execution passed on Bun `1.4.0`, TypeScript `6.0.3`, Linux x86_64: frozen install exit 0, `ci:m0` all 17 steps exit 0, `docs:validate` exit 0, and `architecture:check` exit 0. Evidence: `evidence/gh-010/verification-transcript.md`.
- Accepted residuals: temporary/unreserved naming, deferred exact API signatures, source-text boundary enforcement, local-only browser tooling, in-process raw Bun/Hono benchmarks, and experimental htmx `4.0.0-beta6` behavior. No production framework, performance, security, publication, or htmx 4 GA claim is made.
- Authorization commit `fe6139e409d62833a816117cee9cc482cec6a762` and main merge commit `766d770` are recorded in the GH-010 closure record and transcript. GH-011, GH-026, GH-039, and GH-070 are newly unblocked within the frozen contract.

## 2026-08-21 — GH-011: @bundar/core package skeleton

- Turned the core package manifest into a real contract: `engines.bun >= 1.4.0`, `exports["."]` with `types`/`default` pointing at `./src/index.ts`, a `files` allow-list (`src`, `README.md`), and package-local `typecheck`/`test` scripts. `src/index.ts` remains an intentional empty placeholder — no routing, app, context, or middleware behavior (GH-012–GH-025 scope).
- Added `packages/core/test/import.test.ts`: workspace-consumer import through the root symlink, empty public export surface, allow-list presence, zero runtime dependencies, and engine/typed-entry assertions (4 tests; repository total now 35).
- Implemented the planned `pack:inspect` placeholder as `scripts/pack-inspect.ts` + root script: resolves the workspace package, enforces the ADR-0011 zero-dependency rule for core/jsx, packs with `bun pm pack`, parses the tarball in pure TypeScript, and fails closed on out-of-allow-list files, stale allow-list entries, missing typed exports, or unknown selectors — with tarball cleanup guaranteed on failure.
- Verification: planned issue commands pass (`--filter typecheck`, `bun test packages/core` 4/4, `pack:inspect @bundar/core` exit 0 with 3 packed files and 0 dependencies); four adversarial probes fail closed with no leaked artifacts; full battery green. Evidence: `evidence/gh-011/verification-transcript.md`.
- Residuals: publish-time layout deferred to GH-084–GH-086; tar parser does not interpret pax path overrides (not emitted at current path lengths).

GH-011 is complete; GH-012 and GH-026 are unblocked.

## 2026-08-21 — GH-012: route descriptor and handler types

- Landed the first public type surface of `@bundar/core` in `packages/core/src/routing/types.ts`: `HTTP_METHODS`/`isHttpMethod` (exactly the `Bun.serve` route-table methods; CONNECT/TRACE absent), `RouteParams` literal `:param` inference, `ValidateRoutePath` with documented wildcard/optional-pattern behavior, `RouteHandler` (`Response | Promise<Response>` only, ADR-0016), `RouteMethods` duplicate rejection for const tuples, `RouteMetadata`, and the `HandlerRoute`/`StaticRoute`/`RouteDescriptor` unions with static `Response` entries modeled separately from callable handlers.
- Added `packages/core/test/types/route-descriptor.test-d.ts` (21 compile-time expectations plus 9 runtime tests) with `type-utils.ts` helpers; root `tsconfig.json` now includes `packages/*/test/**/*.ts` so `bun run typecheck` enforces the type tests. Tooling decision: Bun discovery does not match `.test-d.ts`, so the planned command runs the file via an explicit `./` path and a `.test.ts` wrapper re-registers it for normal runs.
- Adversarial verification: a corrupted `RouteParams` expectation fails root typecheck (exit 2) and the restored file passes; the type tests themselves caught three model defects during development (bare-`*` ordering, `Simplify<unknown>` normalization, `@ts-expect-error` placement).
- Full battery green: format, lint, package/root typecheck, architecture (8 source files), `pack:inspect` (4 packed files, 0 dependencies), `bun test` 44/44, build, frozen install, docs validate/links/graph/check. Evidence: `evidence/gh-012/verification-transcript.md`.

GH-012 is complete; GH-013 and GH-014 are unblocked.

## 2026-08-21 — GH-013: app builder, grouping, and module mounting

- Landed `App`, deterministic verb/descriptor registration, grouped prefixes,
  immutable module mounting, and defensive `RouteManifest` snapshots in
  `packages/core/src/{app,module}.ts`. Registration remains pre-compilation and
  does not call `Bun.serve`; the public API avoids accumulating route-list
  generics per the type-system policy.
- Added focused builder tests and explicit `test:types`/`typecheck:perf`
  workspace commands. Verification passed: builder 4/4, core 17/17, root and
  package typecheck, typecheck budget 861ms/10s, lint, architecture, package
  inspection, build, and OKF/docs checks. Evidence: `evidence/gh-013/verification-transcript.md`.

GH-013 is complete; GH-014 is now implemented on its dedicated worktree.

## 2026-08-21 — GH-014: path normalization and route-conflict detection

- Landed Bun-native path normalization and deterministic conflict diagnostics in
  `packages/core/src/routing/{path,conflicts}.ts`: slash-equivalent paths
  canonicalize, method-specific routes may share paths, duplicate normalized
  path/method keys and handler/static replacements fail, and source labels redact
  absolute path-like values.
- Added focused path/conflict tests covering wildcard and unsupported syntax,
  runtime method validation, collision diagnostics, and redaction. Verification
  passed: focused tests 7/7, core regression 24/24, typecheck, lint,
  architecture, package inspection, and build. Evidence:
  `evidence/gh-014/verification-transcript.md`.

GH-014 is complete; GH-015 is unblocked after this branch merges.

## 2026-08-21 — GH-026: @bundar/jsx package and JSX type surface

- Landed the JSX type surface in `@bundar/jsx`: automatic runtime (`jsx`,
  `jsxs`, `Fragment`), development runtime (`jsxDEV`), `JSX.IntrinsicElements`
  for a representative HTML element set, `JSXNode`/`JSXChild`/`JSXComponent`
  types, and `UnsupportedClientEvent` guidance for browser handler conventions.
- Added three package exports: `.`, `./jsx-runtime`, `./jsx-dev-runtime`. Zero
  runtime dependencies. No React, DOM, or hydration dependency.
- TSX consumer fixture at `tests/consumer/jsx/fixture.tsx` compiles with
  `jsxImportSource: "@bundar/jsx"` under TypeScript 6's `react-jsx` transform.
  Client event handlers produce a type error with the guidance literal. Added
  `test:consumer:jsx` script.
- Verification: package typecheck, runtime test 1/1, consumer fixture compile,
  lint, architecture, package inspection, build all exit 0. Evidence:
  `evidence/gh-026/verification-transcript.md`.

GH-026 is complete; GH-027 is unblocked.

## 2026-08-21 — GH-039: @bundar/htmx neutral protocol model

- Created `@bundar/htmx` package with version-neutral protocol constants, header types, and request/response inspection helpers (`isHtmxRequest`, `isBoostedRequest`, `getHtmxTarget`, `getHtmxTrigger`, `withHtmxHeaders`).
- Exported stable `@bundar/htmx/2` dialect adapter pinned to `2.0.10`.
- Exported experimental `@bundar/htmx/4` dialect adapter pinned to `4.0.0-beta6` with explicit `experimental: true` flags and non-GA notices.
- Verification: package typecheck, focused tests 6/6, consumer test 1/1, architecture check, package inspection, and build all exit 0. Evidence: `evidence/gh-039/verification-transcript.md`.

GH-039 is complete; GH-040 is unblocked.

## 2026-08-21 — GH-070: @bundar/cli command framework

- Created `@bundar/cli` package and `bundar` executable (`src/bin.ts`).
- Implemented lightweight argument/flag parsing and command registry.
- Added `--help`, `--version`, and `info` diagnostic command reporting Bun, platform, and architecture without secret leakage.
- Clean exit code model: 0 on success/help, 1 on unknown commands/errors. Zero runtime dependencies.
- Verification: package typecheck, focused tests 6/6, lint, architecture check, package inspection, and build all exit 0. Evidence: `evidence/gh-070/verification-transcript.md`.

GH-070 is complete; GH-071, GH-072, GH-073, GH-074, and GH-078 are unblocked.

## 2026-08-21 — GH-015: compile routes to Bun.serve native tables

- Landed `compileRoutes`/`CompiledServerOptions` in `packages/core/src/routing/compiler.ts` plus `App.compile()` and `App.serve()`. Descriptors normalize and conflict-check first; static `Response` entries pass to Bun untouched; handler wrappers adapt Bun's `request.params` to Bundar's `(request, params)` contract once at compile time; unmatched requests hit a plain 404 `fetch` fallback.
- Integration test against a real `Bun.serve` on an ephemeral port proves Bun owns matching and parameter extraction (`/users/42` → `user:42`), static fast-path serving, shared-path method dispatch (200/201), and 404 fallback.
- Repaired root `typecheck` broken on main since the GH-039 merge by adding `@bundar/htmx` path mappings to the root tsconfig (verified failing before, green after).
- Verification: compiler tests 7/7, integration 5/5, core 36/36, full repo 81/81, typecheck, lint, architecture (21 files), pack inspect, build, docs/graph — all exit 0. Evidence: `evidence/gh-015/verification-transcript.md`.

GH-015 is complete; GH-016, GH-017, GH-022, GH-072, and GH-073 are unblocked.

## 2026-08-21 — GH-027: safe text, primitive, and empty-child rendering

- Landed `escapeText`/`escapeAttributeValue`/`renderPrimitive`/`UnsupportedChildError` in `packages/jsx/src/escape.ts`. Text context escapes `&<>`; attribute values additionally neutralize both quotes. Nullish/boolean children render empty; numbers/bigint use canonical forms; non-finite numbers, objects, arrays, functions, and symbols are rejected with type-naming diagnostics instead of `[object Object]`.
- Fuzz fixtures (`packages/jsx/test/fuzz/escaping.test.ts`) generate a 244+-case pairwise delimiter corpus plus structured hostile composites; hostile payloads (`</script>`, `<img onerror>`, `<svg/onload>`, `\u003c` spellings) provably cannot break out of text context.
- Verification: jsx suite 18/18 (1901 expect calls), root typecheck, lint, architecture (23 files), pack inspect, build, format — all exit 0. Evidence: `evidence/gh-027/verification-transcript.md`.

GH-027 is complete; GH-028, GH-029, and GH-031 are unblocked.

## 2026-08-21 — GH-040: HTMX dialect adapter interface

- Defined the capability-aware `HtmxDialectAdapter` in `packages/htmx/src/dialect.ts`: identity/maturity/`supportedRange`, complete `CapabilityMap` (fail-closed builder in `capabilities.ts`), namespaced metadata, and pure `decodeRequest`/`encodeResponseDirective`/`describeAsset`/`diagnose` methods. Interface fields carry no v2/v4-only names; dialect detail lives under `htmx2:`/`htmx4:` metadata keys.
- Rebuilt `htmx2` (stable, `>=2.0.0 <3.0.0`, all-native capabilities, pinned 2.0.10 asset integrity) and `htmx4Experimental` (experimental, explicit `gaClaim: none`, emulated after-swap/after-settle and unsupported cache-control per GH-008 beta observations) as full adapter implementations.
- Proved extensibility with a synthetic third dialect implemented entirely in tests; asserted immutability and cross-request reusability. Verification: htmx suite 15/15, test:types 9/9, typecheck, lint, architecture (25 files), pack inspect, build, format, docs — all exit 0. Evidence: `evidence/gh-040/verification-transcript.md`.

GH-040 is complete; GH-041, GH-042, GH-046, and GH-047 are unblocked.

## 2026-08-21 — GH-016: preserve the static Response fast path

- Proved the compiler's static pass-through by object identity: the native route-table entry IS the caller's Response instance, with no Bundar closure (`typeof` contrast against handler routes). Live-server comparison against a hand-written raw Bun table shows identical status/headers/body.
- Added fail-closed guards: `StaticRouteMetadataError` rejects static entries declaring `middleware`/`dynamic`/`per-request` meta, documenting when a static response must become a handler (pre-GH-018 boundary).
- Benchmark tool `tools/benchmark/static-fast-path.ts` records raw numbers: −6.23% p50 overhead vs raw Bun (noise; identical native dispatch). Artifact: `evidence/gh-016/static-response-bench.json`.
- Verification: fast-path tests 5/5, full repo 112/112, typecheck, lint, architecture (25 files), pack inspect, build, format, docs — all exit 0. Evidence: `evidence/gh-016/verification-transcript.md`.

GH-016 is complete; GH-023 gains its static-path prerequisite.

## 2026-08-21 — GH-017: request context contract

- Landed `Context` in `packages/core/src/context.ts`: by-reference `request`/native `params`, memoized `url`, lazy single-parse `query()`/`cookie()`, frozen app-level `services` (via `compile`/`serve` options), and per-request `state` (middleware's declared extension vehicle). Handlers now receive the Context as first argument per the GH-012 note; return contract unchanged.
- Proved contexts are created only for dynamic handlers (static entries stay bare Responses), no eager body read, and zero state leakage across 64 gated concurrent requests.
- Benchmark artifact: context+lazy access p50 812ns over 100k iterations (`evidence/gh-017/context-bench.json`).
- Verification: full repo 123/123, typecheck, lint, architecture (26 files), pack inspect, build, format — all exit 0. Evidence: `evidence/gh-017/verification-transcript.md`.

GH-017 is complete; GH-018, GH-019, GH-020, GH-021, and GH-057 are unblocked.

## 2026-08-21 — GH-028: HTML attribute serialization

- Landed `packages/jsx/src/render/attributes.ts`: validated attribute names (`on*` always rejected), 22-name HTML boolean-attribute set with presence/omission semantics, class model (string/nested arrays/boolean record, sorted tokens), deterministic style model (string or sorted hyphenated declarations), and sorted whole-record rendering with both quote forms escaped.
- Security suite proves eight hostile payloads cannot escape double-quoted context (exactly one attribute occurrence, exactly two delimiter quotes after entity removal, no markup smuggling).
- Verification: jsx 41/41 incl. attribute+injection suites, full repo 146/146, typecheck, lint, architecture (27 files), pack inspect, build, format — all exit 0. Evidence: `evidence/gh-028/verification-transcript.md`.

GH-028 is complete; GH-032 and GH-035 are unblocked.

## 2026-08-21 — GH-029: fragments, arrays, iterables, functional components

- Landed `renderNode` in `packages/jsx/src/render/node.ts`: plain-function components (error attribution by name, no lifecycle), Fragment without wrapper, order-preserving flattening of nested arrays/Sets/generators, keys never serialized, cyclic-structure and depth-512 recursion guards, and Promise-returning components rejected with a GH-030 pointer.
- Scale tests: 1000-deep nesting round-trip and a 10,000-item list (exactly 10k `<li>` in order); benchmark artifact records jsx-list p50 4.94ms (`evidence/gh-029/jsx-list-bench.json`).
- Verification: jsx 55/55, full repo 160/160, typecheck, lint, architecture (28 files), pack inspect, build, format — all exit 0. Evidence: `evidence/gh-029/verification-transcript.md`.

GH-029 is complete; GH-030 and GH-032 are unblocked.

## 2026-08-21 — GH-031: explicit raw HTML trust boundary

- Landed `raw()`/`isRawHtml()` in `packages/jsx/src/raw.ts`: symbol-branded frozen values are the only object form that bypasses text escaping. Spread, plain-shape, and JSON impostors cannot forge the brand; attribute-position raw still escapes; no sanitizer is bundled (caller owns sanitization; documented safe alternatives).
- Security suite covers script/SVG/attribute/comment/closing-tag payloads in both directions (unbranded always escape; branded pass verbatim by explicit contract).
- Added `security:raw-html-audit` tool scanning for real raw/unsafeHtml call sites (comment/string lines excluded); current tree reports zero non-test call sites.
- Verification: jsx 62/62, full repo 167/167, typecheck, lint, architecture (29 files), pack inspect, build, format, consumer compile — all exit 0. Evidence: `evidence/gh-031/verification-transcript.md`.

GH-031 is complete; GH-036 gains its raw-boundary prerequisite.

## 2026-08-21 — GH-041: normalized HTMX request metadata

- Landed `normalizeHtmxRequest` in `packages/htmx/src/request.ts`: version-neutral fields (kind, sourceElement, target, currentUrl, boosted, prompt, historyRestore, representation) with present/absent/malformed/unsupported status, explicit `untrusted` trust level on every browser-supplied value, header-alias version mapping (v4 HX-Source → sourceElement), and raw headers reachable only via a `__diagnosticOnly` accessor.
- Security: platform Headers reject CR/LF/NUL at construction (asserted); parser keeps a defense-in-depth control-character layer; attacker-hosted URLs parse as data and are never promoted to redirect destinations.
- Verification: htmx 24/24, full repo 176/176, typecheck, lint, architecture (30 files), pack inspect, build, format — all exit 0. Evidence: `evidence/gh-041/verification-transcript.md`.

GH-041 is complete; GH-043, GH-044, and GH-048 gain their request-metadata prerequisite.

## 2026-08-21 — GH-042: normalized HTMX response directives

- Landed `packages/htmx/src/directives.ts`: typed directive union, deterministic ordering (navigation → targeting → triggers), conflict detection (one navigation directive max, duplicates throw before encoding), trigger merge semantics (sorted JSON, first-definition-wins), CRLF/selector/URL/event-name validation, and non-mutating `applyDirectives` preserving status/body/non-HX headers.
- Neutrality proven: the same directive array encodes identically through v2 adapter, v4 adapter, and the directive encoder (pairwise header equality).
- Verification: htmx 37/37, full repo 189/189, typecheck, lint, architecture (31 files), pack inspect, build, format, docs — all exit 0. Evidence: `evidence/gh-042/verification-transcript.md`.

GH-042 is complete; GH-043, GH-044, GH-050, and GH-052 are unblocked.

## 2026-08-21 — GH-018: startup-composed sync and async middleware

- Landed `composeMiddleware` in `packages/core/src/middleware.ts`: onion ordering with reverse unwind, one-time startup composition in the compiler, sync fast path (all-sync chains return plain Responses — no framework Promise), DoubleNextError/MissingResponseError diagnostics, and `App.use()` scoping where chains travel per-route under frozen meta.middleware.
- Scope discipline: group chains evaluate parent scope lazily; `mount()` strips the module's own chain and applies the mounting app's chain — module middleware never crosses boundaries silently; no app-level/route-level double application.
- Benchmark artifact: bare 121ns, sync×1 149ns, sync×5 207ns, async×1 ~200ns (`evidence/gh-018/middleware-bench.json`).
- Verification: middleware suite 12/12 (live-server scope tests), full repo 201/201, typecheck, lint, architecture (32 files), pack inspect, build, format — all exit 0. Evidence: `evidence/gh-018/verification-transcript.md`.

GH-018 is complete; GH-020, GH-023, and the M4 security middleware chain are unblocked.

## 2026-08-21 — GH-019: params, query, and cookie access adapters

- Landed `packages/core/src/request/adapters.ts`: typed params (`param`/`requiredParam`/`intParam`) over Bun-decoded route matches (encoded-segment edge case recorded live), lazy `queryAdapter` preserving repeated keys, and a `CookieMutations` queue with full Set-Cookie attribute serialization applied explicitly via `withCookies` (non-mutating; signed cookies deferred to GH-062).
- Invalid cookie names and control-character values rejected; request cookie reads never observe queued mutations; no body parsing anywhere (`bodyUsed` asserted false).
- Verification: request-data suite 10/10 incl. end-to-end live-server composition, full repo 211/211, typecheck, lint, architecture (33 files), pack inspect, build, format — all exit 0. Evidence: `evidence/gh-019/verification-transcript.md`.

GH-019 is complete; GH-023 and GH-062 gain their access-adapter prerequisite.

## 2026-08-21 — GH-030: async components and promised children

- Landed `packages/jsx/src/render/async.ts`: `renderNodeAsync` (document-order resolution, component-context rejection wrapping, AbortSignal propagation bounding unbounded work), and `renderNodeAuto` (structural async probe — sync trees stay on the plain-string sync path, no Promise wrapping).
- Determinism proven: slow/fast siblings serialize in document order regardless of timing; abort tests show bounded invocation (fewer components run after abort; zero on pre-aborted signals).
- Benchmark artifact: sync 406µs vs async 720µs on 1000-item trees; auto probe adds ~15% on the sync path (`evidence/gh-030/jsx-async-bench.json`).
- Verification: jsx 75/75 (13 async tests), full repo 224/224, typecheck, lint, architecture (34 files), pack inspect, build, format, docs — all exit 0. Evidence: `evidence/gh-030/verification-transcript.md`.

GH-030 is complete; GH-033 and GH-034 are unblocked.

## 2026-08-21 — GH-043: pinned stable HTMX 2 dialect adapter

- Built the full v2 profile in `packages/htmx/src/dialects/v2/`: exact 2.0.10 pin (GH-008 SHA-256), complete header lists, lifecycle/history/error/inheritance records, supported extensions, and an explicit unimplemented list (hx-vals js:, sse/websocket) — nothing approximated silently. decode/encode delegate to the GH-041/GH-042 neutral layers.
- Type repair: stale GH-040-era HtmxRequestMetadata replaced by an alias to NormalizedHtmxRequest; v4 adapter migrated onto the same delegating decoders.
- Stable-lane purity asserted: no beta/htmx4/v4 strings anywhere in the v2 profile or metadata.
- Verification: v2 suite 13/13 (positive/absent/malformed/conflict per field), htmx 50/50, browser htmx2 lane exit 0, full repo 237/237, typecheck, lint, architecture (35 files), pack inspect, build, format — all exit 0. Evidence: `evidence/gh-043/verification-transcript.md`.

GH-043 is complete; GH-045, GH-046, GH-047, GH-049, GH-051, GH-052, and GH-053 are unblocked.

## 2026-08-21 — GH-044: experimental HTMX 4 beta6 dialect adapter

- Built the full provisional v4 profile in `packages/htmx/src/dialects/v4/`: experimental identity pinned to 4.0.0-beta6 (GH-008 SHA-256), HX-Source request aliasing onto neutral sourceElement, GH-008 lifecycle observations (afterRequest not fired under beta; after-swap/after-settle emulated), five migration-difference records with fixture/record status, and cache-control unsupported. Every provisional field annotated; gaClaim states GA revalidation is mandatory.
- Isolation proven: separate frozen adapters; v2 stays stable-native; HX-Source decodes only under v4; shared neutral encoder produces identical headers.
- Verification: v4 suite 13/13, htmx 63/63, browser htmx4 lane exit 0, full repo 250/250, typecheck, lint, architecture (36 files), pack inspect, build, format — all exit 0. Evidence: `evidence/gh-044/verification-transcript.md`.

GH-044 is complete; GH-045, GH-046, GH-047, GH-049, GH-051, GH-052, and GH-054 are unblocked.

## 2026-08-21 — GH-057: bounded form and request-body parsing

- Landed `packages/core/src/request/body.ts`: lazy content-type-dispatched APIs (`parseForm`/`parseJson`/`parseText`) with secure frozen defaults (1 MiB, 100 fields, 10 files, depth 8, 10s timeout), oversize rejection before unbounded allocation (Content-Length pre-check + mid-stream reader cancellation), single-consumption semantics (`BodyConsumedError`), controlled 415/400 error classes, and ordered repeated-key form data distinguishing absent from empty.
- Live-server test proves opt-in only: a passthrough handler leaves `bodyUsed` false — no route pays parsing cost unless it asks.
- Verification: body suite 13/13, full repo 263/263, typecheck, lint, architecture (37 files), pack inspect, build, format — all exit 0. Evidence: `evidence/gh-057/verification-transcript.md`.

GH-057 is complete; GH-058, GH-061, GH-064, and GH-067 are unblocked.
