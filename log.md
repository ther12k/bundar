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

## 2026-08-21 — GH-073: route manifests and typed URL builders

- Landed `packages/core/src/manifest.ts` (deterministic manifest from named routes with duplicate-name detection; typed URL-builder codegen with per-route param types, optional query objects with repeated array values, percent-encoding) and the `bundar routes generate|check` CLI command with byte-exact stale detection (exit 1 on drift) — handlers never execute; the entry's manifest prints from a child process.
- `@bundar/cli` gained its first intentional dependency (`@bundar/core` workspace) per the package-API map; CLI tests import via package name after a boundary violation was caught and fixed.
- Consumer fixture generates, imports, and fetches through a live server: encoded params resolve, repeated query values serialize, missing-param runtime throws mirror the type contract; generated output compiles under real `tsc --strict`.
- Verification: cli routes suite 6/6, consumer 6/6, full repo 275/275, typecheck, lint, architecture (39 files), pack inspect, build, format — all exit 0. Evidence: `evidence/gh-073/verification-transcript.md`.

GH-073 is complete; GH-075 and GH-079 gain their manifest prerequisite.

## 2026-08-21 — GH-020: HttpError and the global error boundary

- Landed `packages/core/src/errors.ts` (11-code HttpError with canonical statuses, deterministic public envelopes, details/headers/cause, httpErrors constructors, ClientDisconnectError + abort classification) and `packages/core/src/error-boundary.ts` (one boundary: envelopes for expected failures, opaque 500s in production with message-only-in-development, 499 for client disconnects, thrown-Response preservation, structured logging hook, and a static safe fallback when custom renderers throw).
- Live-server tests prove sync and async handler failures convert end-to-end with no internal leakage; NODE_ENV=production suite asserts no message/stack/path fragments.
- Verification: errors suite 13/13 + production 4/4, full repo 292/292, typecheck, lint, architecture (41 files), pack inspect, build, format — all exit 0. Evidence: `evidence/gh-020/verification-transcript.md`.

GH-020 is complete; GH-022, GH-023, and GH-065 are unblocked.

## 2026-08-21 — GH-021: explicit response helpers

- Landed `packages/core/src/response.ts`: text/json/html/redirect/seeOther/empty/file helpers (all native Responses, no implicit return conversion) plus `withHeaders` with append semantics for Set-Cookie/Vary and overwrite elsewhere — multi-values never collapse.
- Type-contract test proves string/object handler returns are compile errors; `Response | Promise<Response>` stays the only contract. Redirect statuses documented (301/308 method-preserving; 303 forces GET).
- Verification: responses suite 12/12 + type tests, full repo 304/304, typecheck, lint, architecture (42 files), pack inspect, build, format — all exit 0. Evidence: `evidence/gh-021/verification-transcript.md`.

GH-021 is complete; GH-022, GH-023, GH-033, and GH-045 are unblocked.

## 2026-08-21 — GH-022: not-found, method, and lifecycle terminal behavior

- Added the application not-found fallback (`compile`/`serve` `notFound` option) over Bun's fetch fallthrough; wrong-method behavior stays whatever Bun natively exposes (no invented 405 negotiation, per scope); explicit HEAD/GET/POST registrations never shadowed (HEAD parity with header-only responses).
- Lifecycle verified: ephemeral-port ownership, stop(true) force-close vs graceful stop() waiting for in-flight requests, and a 10× start/stop cycle leaving zero listeners.
- Verification: terminal-behavior 7/7 + server-lifecycle 5/5, full repo 314/314, typecheck, lint, architecture (42 files), pack inspect, build, format — all exit 0. Evidence: `evidence/gh-022/verification-transcript.md`.

GH-022 is complete; GH-023 gains its final prerequisite.

## 2026-08-22 — GH-032: document, doctype, head, and void-element helpers

- Landed void-element serialization (13 tags, never closed, children dropped) and raw-text boundaries in the node renderer: script/style text stays unescaped per spec while `</script>`/`</style>` payloads are neutralized with grammar-correct escapes.
- Added `document()`/`renderDocument()` with explicit lang/charset/title options (no inferred defaults) and single-`<html>`-root enforcement via DuplicateDocumentRootError; doctype is exactly `<!doctype html>`. Intrinsic types extended with html/head/body/meta/title/script/style (nonce-ready for CSP).
- Verification: document suite 11/11, jsx 86/86, full repo 325/325, consumer TSX compile, typecheck, lint, architecture (44 files), pack inspect, build, format — all exit 0. Evidence: `evidence/gh-032/verification-transcript.md`.

GH-032 is complete; GH-033 is unblocked.

## 2026-08-22 — GH-033: renderToString and JSX Response integration

- Landed `renderToString`/`renderToStringAsync`/`renderToStringAuto` (sync trees return plain strings with zero Promise involvement; async trees resolve in document order with abort propagation) and `page()`/`fragment()` Response helpers inside @bundar/jsx with no core import — content type `text/html; charset=utf-8` default, safe override, full-document doctype + single-html-root enforcement rejecting identically on sync and async paths.
- Consumer independence proven by the architecture check (jsx→core imports forbidden and absent).
- Verification: render 6/6 + response 7/7, full repo 338/338, consumer TSX compile, typecheck, lint, architecture (46 files), pack inspect, build, format — all exit 0. Evidence: `evidence/gh-033/verification-transcript.md`.

GH-033 is complete; GH-034, GH-036, GH-048, GH-050, and GH-059 are unblocked.

## 2026-08-22 — GH-023: HTTP core integration and contract test matrix

- Landed the M1 contract matrix (13 tests on one real Bun server): static fast path, typed params, query adapters, wildcards, grouped+mounted middleware scoping, expected/opaque error flows through the boundary, and the configured 404 — plus 50-request concurrency isolation with per-request identity checks.
- Added the external type-consumer fixture (imports public types via the workspace package name, typechecks, and serves a live round-trip) and `api:report` rendering the exact 61-export surface to `artifacts/api/core.md`; new scripts `test:integration:core` (42 tests), `test:consumer:core`, `api:report`.
- Verification: full repo 352/352, all planned commands exit 0, no skips or suppressed failures. Evidence: `evidence/gh-023/verification-transcript.md`.

GH-023 is complete; GH-024 and GH-025 are unblocked.

## 2026-08-22 — GH-024: M1 performance and resource gate

- Replaced the deferred Bundar benchmark stub with the real adapter: an `App` covering all 9 scenarios compiled through `compileRoutes`, chains composed once at startup; in-process table dispatch disclosed as standing in for Bun's native C++ dispatch; static entries cloned per request (JS bodies are one-shot; the native layer re-sends).
- Added fresh-subprocess startup/RSS probes (raw switch vs bundar build+compile), `bench:m1`/`bench:report` scripts, report schema 2, and the fail-closed static tolerance check (≤ 2.0× raw-bun p50, reviewed in `delivery/gates/m1-performance.md`).
- Results (committed `artifacts/bench/m1.json`): static 0.65× raw p50 (runs: 0.65×/0.91×/1.22×, all ≤ 2.0×), HTTP-core scenarios 0.58×–1.29×, JSX ratios are disclosed workload differences, `parseForm` ~2.5× tracked as optimization issue #97, startup +~8ms / RSS +~9MiB one-time.
- Verification: parity 9/9, full repo 352/352, typecheck, lint, architecture (46 files), docs validate/links, build — all exit 0; GH-007's two deferred-adapter assertions updated to assert the real adapter (nothing skipped). Evidence: `evidence/gh-024/verification-transcript.md`.

GH-024 is complete; GH-025 is unblocked and feeds GH-083.

## 2026-08-22 — GH-025: M1 HTTP-core gate

- Added the fail-closed `ci:m1` battery (28 ordered steps, strict superset of `ci:m0`: type-level tests, 42-test core contract matrix, three external type consumers, routes + API snapshot checks, pack:inspect for core and jsx, raw-HTML audit, committed M1 perf artifact tolerance check, both browser lanes, full suite, build) and `api:check`, which byte-compares the committed `artifacts/api/core.md` snapshot against the live surface.
- Ran the full gate end-to-end: 28/28 exit 0 (one honest mid-run stop at format:check for the unformatted gate script; fixed and re-run from step 1 — nothing skipped).
- Recorded the M1 gate in `delivery/gates/m1.md`: all 14 M1 issues complete with transcripts; reviewed M0 deviations (CLI workspace dependency, bench schema 1→2, new scripts — no public-API exception, no ADR required); authorization of M2/M3 dependent work (GH-034/035 immediately unblocked); no JSX/HTMX release claims. Evidence: `evidence/gh-025/verification-transcript.md`.

GH-025 is complete; the M1 milestone is closed. GH-034, GH-035, GH-045–048 are next in dependency order.

## 2026-08-22 — GH-048: full-page and fragment negotiation

- Added `view()`/`negotiateView()` to @bundar/htmx: one route definition (fragment + layout/page) serves a complete document to normal, boosted, and history-restore navigation and a bare fragment to standard enhanced requests — decided from normalized metadata, never raw headers. Every response carries `Vary: HX-Request, HX-Boosted, HX-History-Restore-Request`; `negotiateView()` exposes the rule for GH-049's cache/history policy.
- @bundar/htmx gained its first workspace dependency (@bundar/jsx, explicitly allowed by the frozen ADR-0016 rules; architecture check and pack:inspect green).
- Browser harness: `/page-fragment` fixture route implemented with `view()`; both lanes (htmx 2.0.10 and 4.0.0-beta6) assert the four representations via fetch and exercise a real boosted navigation (document body swap, one html root) — dual-lane coverage substitutes for the planned `test:browser:dual` command until GH-055's fixture (tooling decision in the transcript).
- Verification: negotiation tests 18/18, full repo 370/370, both browser lanes, pack:inspect, architecture (47 files), typecheck, lint, build, docs — all exit 0. Evidence: `evidence/gh-048/verification-transcript.md`.

GH-048 is complete; GH-049, GH-050, GH-053, GH-054, and GH-065 are unblocked.

## 2026-08-22 — GH-067: request budgets, timeouts, and abort propagation

- Added `requestBudget()` middleware and the budget model to @bundar/core: composite AbortSignal firing on the first of client disconnect / deadline / server shutdown with source tracking, startup-validated per-route overrides (tighten-only against frozen maximums), deadline race answering 503+Retry-After envelopes, body-limit failures mapped to 408/413, and source-based abort classification (client→499, deadline→503) so aborts never surface as opaque 500s.
- Fixed two latent defects the new fixtures exposed: (1) the body-parser slowloris guard cancelled the reader with a reason that never reached `read()` — dribbled bodies were silently accepted as complete partial reads; (2) `compileRoutes` never forwarded the `error` hook, so handler failures got Bun's default 500 instead of the application boundary.
- Public surface grew deliberately to 71 exports (two new HttpError codes 408/503; snapshot regenerated, api:check green). Cleanup is verified per request (`disposed`, `attachedSources === 0`); non-cooperative handlers answer at the deadline while cooperative ones stop on the signal (platform limit documented).
- Verification: budgets 27/27 (real-server slowloris 408, slow-handler 503 with recorded work stop, mid-request disconnect with zero unexpected-failure classifications), body 13/13, full repo 397/397, typecheck, lint, architecture, pack:inspect, build, docs — all exit 0. Evidence: `evidence/gh-067/verification-transcript.md`.

GH-067 is complete; GH-068 is unblocked.

## 2026-08-22 — GH-058: Standard Schema validation adapter

- Implemented @bundar/schema: spec-copied Standard Schema v1 types, `validateSchema()` (sync + async validators, issues normalized to message + PropertyKey path with the library original preserved on `raw` as the explicit escape hatch, `SchemaDialectError` fail-closed for nonconforming dialects), and the request-source mappers — validateForm/validateJson (bounded single-consumption parsers), validateQuery (repeats → string[]), validateParams, validateHeaders. Coercion stays with the validator; Bundar passes decoded data untouched.
- Consumer fixtures for two independent real validators (Zod 4.4.3, Valibot 1.4.2 — root devDependencies, never shipped): external tsc project proves output-type inference from both schema libraries through the adapter; 5 runtime tests cover coercion, defaults, and failure normalization. `test:consumer:schema` script added.
- Verification: schema 15/15, consumer 5/5 + typecheck, full repo 417/417, package+root typecheck, lint, architecture (51 files; core still has zero schema edge), pack:inspect schema+core, build, docs — all exit 0. Guide at `docs/guides/validation.md`. Evidence: `evidence/gh-058/verification-transcript.md`.

GH-058 is complete; GH-059 is unblocked.

## 2026-08-22 — GH-059: validation results and field-error rendering data

- Added `toFieldErrors()`/`redactSubmitted()` to @bundar/schema: failed validations become stable rendering data — per-field message lists preserving multiple errors in order, form-level globals kept distinct, deterministic ordering, nested paths mapped to addressable ids — with submitted values retained only when safe (19-key sensitive policy + caller `redactKeys`; files/bytes never retained).
- Added the accessible `ErrorSummary` component to @bundar/jsx (structural props, no schema import — boundary intact): role="alert", heading, anchor links targeting dash-form field ids, globals without links, empty models render nothing, messages escaped.
- New fail-closed `security:validation-redaction` audit: plants a secret in every sensitive key and proves none survive into the serialized model, drops byte content, and statically forbids direct logging calls in schema/jsx sources.
- Verification: schema 26/26, jsx forms 6/6, full repo 434/434, typecheck×3, lint, architecture (53 files), pack:inspect×2, build, docs — all exit 0. Evidence: `evidence/gh-059/verification-transcript.md`.

GH-059 is complete; GH-060 and GH-065 are unblocked.

## 2026-08-22 — GH-061: CSRF primitives and form middleware

- Created @bundar/security under new ADR-0017 (supersedes ADR-0016's package map by adding exactly this package; boundaries now enforce 8 rules). Synchronizer-token CSRF: HMAC-SHA-256 tokens bound to the session cookie, constant-time MAC comparison, expiry + rotation on verified state changes, optional pluggable single-use replay store, and a fail-closed Origin/Sec-Fetch-Site chain (missing evidence rejected).
- csrfMiddleware: safe methods issue-only (never rotate/consume); unsafe methods verify origin AND submitted token — header first (HTMX), then hidden field read from a request clone so handler parseForm still sees the body; generic 403 envelope with reasons server-side only. CsrfInput hidden-field helper in @bundar/jsx (structural, escaped).
- Verification: security 22/22, jsx forms 9/9, security:csrf audit (all failure modes reject; tokens absent from envelopes), both browser lanes with real no-JS form navigation, header submission, and token-less 403 flows (hard-asserted in htmx2 and htmx4), full repo 459/459, architecture, pack:inspect, build, docs — all exit 0. Evidence: `evidence/gh-061/verification-transcript.md`.

GH-061 is complete; GH-064 and GH-068 are unblocked.

## 2026-08-22 — GH-062: secure cookie and session interfaces

- Added the session layer to @bundar/security: narrow SessionStore contract (load/commit/destroy, zero database coupling), 256-bit canonical session ids (malformed cookie values never become lookup keys), and sessionMiddleware with secure cookie defaults (HttpOnly, SameSite=Lax, Path=/, Secure-unless-explicitly-local, no Domain, expiry aligned to an idle timeout bounded by an absolute ceiling). Untouched sessions write no cookie.
- Security properties machine-checked: store returns copies so mutation never leaks; unknown/expired/malformed ids get brand-new empty sessions; rotate() (fixation policy — call on login) issues a fresh id and destroys the old record; destroy() invalidates record + cookie. Memory store is tests/demos-only with fail-closed capacity; docs/guides/sessions.md states the production durable-store + key-management requirement and the reviewed decision to skip signed/encrypted cookie payloads (state lives behind the store).
- Verification: 19 new session tests (41/41 security suite), security:cookies audit (cookie policy + lifecycle + docs requirement), both browser lanes run a real-cookie session lifecycle (login-rotate → whoami → logout → anonymous), full repo 478/478, typechecks, lint, architecture (59 files), pack:inspect, build, docs — all exit 0. Evidence: `evidence/gh-062/verification-transcript.md`.

GH-062 is complete; GH-063, GH-068, and GH-077 are unblocked.

## 2026-08-22 — GH-034: renderToStream with backpressure and abort

- Implemented streaming JSX rendering in @bundar/jsx: an async-generator walker mirroring renderNode semantics segment-by-segment while awaiting promised children/direct children/array entries/async components in document order; renderToStream enqueues one segment per pull (awaited children are the flush points — nothing is held while they resolve) with a ByteLengthQueuingStrategy watermark for real backpressure.
- Cancellation (reader cancel / AbortSignal) stops the walk, swallows abandoned settlements, and settles the finished promise observably (RenderCancelledError / abort); mid-stream failures wrap as StreamRenderError with bytesWritten — after the first flush the status line is committed and no replacement status is pretended. streamResponse() carries finished on the text/html Response.
- Verification: 13 streaming tests (non-buffering gate proof, backpressure pause, cancel/abort release, mid-stream commit semantics, Unicode stream-decoding parity, byte-exact agreement with renderToStringAsync), full repo 491/491, bench artifact recorded (streaming p50 1.40 ms vs 0.30 ms buffered for 500 async items — honest overhead accounting), architecture, pack:inspect, build, docs — all exit 0. Evidence: `evidence/gh-034/verification-transcript.md`.

GH-034 is complete; GH-036 still waits on GH-035.

## 2026-08-22 — GH-035: typed common HTMX attributes

- Added typed hx-* attributes to @bundar/jsx: the stable dialect-common subset (string-literal types for enumerable grammar — swap bases + modifiers, target selector/this/closest/find/next/previous, encoding, boost, validate — and documented open strings for triggers/headers/sync) merged into every intrinsic element via the new types/intrinsic.ts; raw attribute names stay visible and the renderer never rewrites them. Zero runtime coupling to @bundar/htmx (pack:inspect + architecture green).
- Experimental/dialect-specific attributes are opt-in per app compilation via declaration merging on the deliberately-empty HtmxExperimentalAttributes interface — no global widening to any (unknown attributes rejected with @ts-expect-error proof; the one eslint suppression is justified in source).
- Type-level proofs live in a TSX fixture compiled by the package + root typecheck (react-jsx + jsxImportSource @bundar/jsx; unused @ts-expect-error is itself an error so the fixture cannot rot); runtime tests assert byte-exact unrewritten output. Full repo 496/496. Evidence: `evidence/gh-035/verification-transcript.md`.

GH-035 is complete; GH-036 (its full dependency set now done), GH-047, and GH-051 are unblocked.

## 2026-08-22 — GH-036: JSX conformance, security, and snapshot coverage

- Closed M2 renderer coverage: a primitive-by-primitive conformance matrix (positive+negative for every public API), a 13-case byte-exact snapshot corpus with review-gated regeneration (--reviewed-by required; version bumped; blind updates structurally impossible), seeded property tests (~6,000 assertions: escaping closure, injection impossibility, sync/async/stream byte parity, determinism), a 13-payload security corpus audit (incl. raw-text breakouts) with committed artifact, and a real-browser DOM comparison runner for six edge cases (test:browser:jsx).
- The browser comparison exposed a real defect: textarea/title are RCDATA (entities decode), but the serializer applied script-style `<\/` escapes — browsers displayed literal backslashes and textarea values did not round-trip. Fixed by entity-escaping RCDATA hosts (lossless there); script/style keep their grammar escapes. Also completed the intrinsic element type map (ul/li/table/media/…) and widened hx-target to its primary form (any CSS selector, literals kept for completions).
- Verification: jsx 146/146, full repo 516/516, consumer compile, browser DOM comparison, security corpus, snapshot-gate refusal, typechecks, lint, architecture, pack:inspect, build, docs — all exit 0. Evidence: `evidence/gh-036/verification-transcript.md`.

GH-036 is complete; GH-037 and GH-038 are unblocked (all M2 implementation issues done).

## 2026-08-22 — GH-037: M2 JSX performance and memory gate

- Added the renderer-level M2 gate (`bench:m2` → artifacts/bench/m2.json): seven JSX scenarios measured cold (tree construction + first render) and steady, with renderer parity asserted fail-closed BEFORE timing (async ≡ streaming; sync ≡ both wherever it accepts the tree) and escaped markers required in every timed output — benchmarks cannot be met by disabling escaping. Memory proxies (rss/heap deltas) recorded per block; raw samples retained. bench:report now dispatches on the artifact's gate field (m1 regression-checked).
- The parity pre-check caught a real defect: renderNodeAsync emitted `</meta>` for void elements and skipped raw-text serialization, disagreeing with the sync renderer. Fixed to mirror sync semantics exactly; all three renderers are now byte-pinned per gate run.
- Baseline recorded (steady p50): fragment 1.1µs, document 5.5µs, 1000-item list 1.08ms, streaming async list 3.51ms (~3× documented overhead); budgets reviewed in delivery/gates/m2-performance.md (steady ≤ 1.5× at GH-083; parity/escaping absolute). Full repo 516/516. Evidence: `evidence/gh-037/verification-transcript.md`.

GH-037 is complete; GH-038 is unblocked.

## 2026-08-22 — GH-038: M2 server-JSX gate

- Added the fail-closed `ci:m2` battery: 37 ordered steps, a strict superset of `ci:m1`, adding the schema type consumer, all five security audits (raw-HTML, validation redaction, JSX corpus, CSRF, cookies), the browser DOM comparison lane, and read-only verification of the committed M2 performance artifact (review-gated, never silently regenerated in CI). Ran end-to-end: 37/37 exit 0.
- Recorded the M2 gate in `delivery/gates/m2.md`: all 13 M2 issues complete with transcripts; reviewed raw-HTML call-site policy (branded `raw()` only, enumerable via audit) and streaming limitations (~3× overhead documented; no replacement status after the first flush; cancellation platform limit); the approved public surface; authorization of GH-071/GH-079. Dependency direction machine-enforced (core/jsx zero-dep; 8 rules). No React/hydration anywhere.
- Evidence: `evidence/gh-038/verification-transcript.md`.

GH-038 is complete; **the M2 milestone is closed**. GH-071 and GH-079 are unblocked.

## 2026-08-22 — GH-049: cache variation and history safety policy

- Added the cache/history policy to @bundar/htmx: fail-safe defaults (full negotiation Vary + no-store), validated opt-ins (sMaxage/maxAge; private never public; max-age ≤ s-maxage), lossless Vary merging, applyCachePolicy that never clobbers handler cache-control, and historyPolicyFor surfacing the pinned per-dialect history facts (incl. the htmx 4 beta's provisional cache-rework note).
- Built the simulated proxy cache (tests/proxy-cache) proving all four negotiation variants coexist under the policy Vary, reproducing the missing-Vary poisoning risk as documentation, and never storing private/no-store responses. security:cache audit runs all property groups fail-closed.
- Browser lanes gained exact-Vary assertions and a real history-restore scenario (back to the pushing page, forward through htmx's restore — document installed, one html root); hard-asserted on htmx 2, observed-and-passed on the htmx 4 beta.
- Verification: cache+proxy 15/15, audit green, both lanes green, full repo 531/531, typechecks, lint, architecture (63 files), pack:inspect, build, docs — all exit 0. Evidence: `evidence/gh-049/verification-transcript.md`.

GH-049 is complete.

## 2026-08-22 — GH-050: progressive action response composer

- Added action()/actionResponse() to @bundar/htmx: one explicit action result serves enhanced submissions (rendered fragment + GH-042 directives + GH-048 Vary + GH-049 fail-safe cache policy) and ordinary submissions (PRG redirect, 303 default, approved set 301/302/307/308). Validation fires in action() before any response commits — missing fallback redirect throws unless the route explicitly opts out; conflicting fields are diagnosed; body statuses restricted (204 excluded). String fragments escape as text; markup needs a tree or explicit raw(). Boosted/restore requests follow the document path (redirect like ordinary navigations).
- Browser fixture /action-save + an action-fallback scenario in both lanes: ordinary POST proven a redirect (opaque-redirect type + followed fetch landing on the PRG target document), enhanced POST returns the fragment HTML with trigger header and Vary.
- Verification: actions 15/15, both lanes green, full repo 546/546, typechecks, lint, architecture (64 files), pack:inspect, build, docs — all exit 0. Evidence: `evidence/gh-050/verification-transcript.md`.

GH-050 is complete; GH-051, GH-052, GH-053, GH-054, and GH-060 are unblocked.

## 2026-08-22 — GH-065: page-versus-fragment error negotiation

- Added error-view negotiation to @bundar/htmx: presentation is separated from classification — full error documents for ordinary navigation (via jsx page(), doctype enforced), local fragments/modal regions/empty bodies for enhanced requests, retarget hints from the server policy only (client HX-Target is never authorization), and 401/403 on the document path unless the app explicitly opts in via renderAuthFragment. The htmx 2 vs 4 error-swap difference is pinned adapter data; under v4's no-swap default the composer adds an explicit reswap. validationErrorView() + renderValidationErrorFragment() wire GH-059 models into the standard summary region. All error responses: private/no-store, negotiation Vary, escaped.
- Browser-proven in both lanes: enhanced 422 serves the field-error fragment retargeted to the server-known region (hostile client target ignored); ordinary 422 and both 403 flows receive full-page documents — the deliberately-secret fragment never leaks.
- Verification: error-negotiation 14/14, both lanes green, full repo 560/560, typechecks, lint, architecture (65 files), pack:inspect, build, docs — all exit 0. Evidence: `evidence/gh-065/verification-transcript.md`.

GH-065 is complete; GH-068 awaits GH-060/063/064/066.

## 2026-08-22 — GH-060: progressive validated form actions

- Added runFormAction() to @bundar/htmx, composing bounded parsing (GH-057), Standard Schema validation (GH-058), GH-059 field-error rendering with REDACTED retained values, GH-065 error negotiation, and the GH-050 action composer behind one handler API — identical business validation for normal browsers and enhanced flows, 422 in both worlds on invalid input, no JSON client code. Success fragments execute exactly once per request inside optional transaction hooks (rollback-before-response on business failure). A raw-submission leak into form renderers found during testing was fixed (renderers now receive only the redacted model).
- htmx gained @bundar/core and @bundar/schema workspace dependencies — the direction ADR-0016's frozen htmx row already permitted; boundaries.json aligned (core/jsx remain zero-dependency; 8 rules, 66 files green).
- Verification: form-actions 7/7, both browser lanes with the validated-form scenario (invalid enhanced fragment + retarget; invalid ordinary document; valid enhanced fragment; valid ordinary PRG), full repo 567/567, typechecks, lint, architecture, pack:inspect ×2, build, docs — all exit 0. Evidence: `evidence/gh-060/verification-transcript.md`.

GH-060 is complete; GH-068 awaits GH-063/064/066.

## 2026-08-22 — GH-064: multipart upload policy and safe temp files

- Added the upload pipeline to @bundar/core: worst-case-envelope Content-Length pre-check before reading, per-part byte/file/field caps enforced during iteration, server-generated <uuid>.part temp names (client filenames can never select paths), sanitized basename-only display names, claimed MIME types recorded as untrusted, verifier + quarantine hooks as the malware-scan/sniff integration points, temp files removed on success/error/rejection/cancellation plus a teardown registry (cleanupAllUploads). Core surface 71→77 exports (snapshot regenerated deliberately).
- 14 tests (sanitization matrix, during-read limits, lifecycle on every path, quarantine, truncation fail-closed, duplicates) + the fail-closed security:uploads audit + docs/guides/uploads.md with the production mandate (sniffing vs claimed type, risk-appropriate scanning, separate origin, nosniff serving).
- Verification: uploads 14/14, audit green, full repo 581/581, typechecks, lint, architecture (67 files), pack:inspect, api:check (77 exports), build, docs — all exit 0. Evidence: `evidence/gh-064/verification-transcript.md`.

GH-064 is complete; GH-068 now awaits only GH-063 and GH-066.

## 2026-08-22 — GH-051: version-neutral out-of-band and partial update intents

- Added `serializeUpdates()` and `auditUpdateMechanisms()` to @bundar/htmx: applications describe multi-region updates once as stable `UpdateIntent` records (target ID + explicit operation: `replace-content`, `replace-element`, `append`, `prepend`, `remove`). The adapter chooses the OOB swap directive (`hx-swap-oob`) without altering destructive vs additive meaning.
- Intent validation fails closed on duplicate target IDs, missing target IDs, missing content on additions/replacements, content on remove operations, or unsupported dialect capabilities. Prebuilt HTML strings ride the branded `raw()` trust boundary.
- Verified in unit tests (9/9) and real browser lanes (`test:browser:htmx2` / `htmx4`) where counter replacement and list append execute out-of-band across both dialect lanes from identical intent definitions.
- Full repo 590/590, typechecks, lint, architecture (68 files), pack:inspect, build, docs all green. Evidence: `evidence/gh-051/verification-transcript.md`.

GH-051 is complete; GH-055 and GH-063 are unblocked.

## 2026-08-22 — GH-045: HTMX asset registry and local serving contract

- Implemented asset registry and local serving in @bundar/htmx: `getBundledAsset()` loads verified SHA-256-pinned assets offline (htmx 2.0.10 and htmx 4.0.0-beta6), `createHtmxAssetHandler()` serves local assets with `application/javascript`, ETag matching SHA-256 with 304 Not Modified, `Cache-Control: public, max-age=31536000, immutable`, and `x-htmx-version` header.
- Added `<HtmxScript>` helper in @bundar/htmx: emits secure script tag referencing local asset with `data-htmx-version`, SRI integrity hash (`integrity`), `crossorigin="anonymous"`, and CSP `nonce` support.
- Added `validateAssetDialectMatch()` and `AssetDialectMismatchError` detecting asset/dialect version mismatches.
- Verified via unit tests (14/14), browser asset-serving scenario in both `htmx2` and `htmx4` lanes, pack:inspect, and full repository tests (604/604). Evidence: `evidence/gh-045/verification-transcript.md`.

GH-045 is complete; GH-053, GH-054, and GH-066 are unblocked.

## 2026-08-22 — GH-046: normalize HTMX lifecycle and application events

- Added normalized lifecycle events (`BundarLifecycleEvent`), dialect mapping (`resolveDialectEvent`, `getEventMappingTable`), server-triggered application events (`createApplicationEvent` with injection and JSON safety checks), and raw event escape hatch (`rawDialectEvent`) in @bundar/htmx.
- Mappings explicitly distinguish exact, approximate (e.g. htmx 4 provisional history cache rework), and unsupported mappings.
- Verified in unit tests (8/8), browser lanes, full repo suite (612/612), typechecks, architecture (71 files), and docs validation. Evidence: `evidence/gh-046/verification-transcript.md`.

GH-046 is complete.

## 2026-08-22 — GH-047: inheritance and extension compatibility helpers

- Added inheritance helpers in @bundar/htmx: `formatDisinherit()`, `diagnoseInheritance()`, `HTMX2_INHERITED_ATTRIBUTES`, modeling v2 default-inheriting vs v4 explicit-by-default behavior.
- Added extension helpers in @bundar/htmx: `OFFICIAL_EXTENSIONS`, `HTMX_2_COMPAT_EXTENSION` migration reference, `formatExtensionAttribute()`, `diagnoseExtension()`, and `rawExtension()` escape hatch.
- Verified in unit tests (12/12), browser lanes in `htmx2` and `htmx4`, full repository tests (624/624), architecture (73 files), pack:inspect, build, and docs. Evidence: `evidence/gh-047/verification-transcript.md`.

GH-047 is complete; GH-078 is unblocked.

## 2026-08-22 — GH-052: redirect, location, and history helpers

- Added `validateRedirectUrl()`, `composeNavigation()`, `htmxRedirect()`, `htmxLocation()`, and `htmxRefresh()` in @bundar/htmx.
- Implemented open-redirect defense: protocol-relative URLs (`//evil.com`), dangerous URI schemes (`javascript:`), and unlisted external origins are denied by default with `InvalidRedirectUrlError`.
- Verified in unit tests (11/11), `security:redirects` audit script, browser lanes in `htmx2` and `htmx4`, full repository tests (635/635), architecture (74 files), pack:inspect, build, and docs. Evidence: `evidence/gh-052/verification-transcript.md`.

GH-052 is complete.

## 2026-08-22 — GH-053: close the HTMX 2 browser conformance profile

- Closed stable-lane browser conformance profile under htmx 2.0.10 across 19 browser scenarios (request normalization, response directives, page/fragment negotiation, boosted navigation, action fallback, error negotiation, CSRF, sessions, OOB updates, history restore, adaptive navigation, and offline asset serving).
- Published machine-readable conformance report to `artifacts/conformance/htmx2.json` via `conformance:report`.
- Published `docs/compatibility/htmx2.md` compatibility guide detailing verified capabilities and explicitly unsupported upstream features (`hx-vals js:`). Evidence: `evidence/gh-053/verification-transcript.md`.

GH-053 is complete.

## 2026-08-22 — GH-054: close the HTMX 4 beta browser conformance profile

- Closed experimental-lane browser conformance profile under htmx 4.0.0-beta6 across 19 browser scenarios (request normalization with HX-Source aliases, response directives, page/fragment negotiation, boosted navigation, action fallback, error negotiation with explicit reswap, CSRF, sessions, OOB updates, history restore, adaptive navigation, and offline asset serving).
- Published machine-readable conformance report to `artifacts/conformance/htmx4-beta6.json` via `conformance:report -- htmx4-beta6`.
- Published `docs/compatibility/htmx4-beta6.md` compatibility guide detailing provisional findings, differences from v2, and mandatory M7 GA revalidation. Evidence: `evidence/gh-054/verification-transcript.md`.

GH-054 is complete; GH-055 is unblocked.

## 2026-08-22 — GH-055: unchanged-source dual-dialect reference fixture

- Created `examples/dual-dialect-fixture/` — a 100% dialect-agnostic application using only @bundar/htmx neutral APIs (view, action, actionResponse, serializeUpdates, htmxRedirect, errorViewResponse, HtmxScript, createHtmxAssetHandler). Dialect adapter injected solely at bootstrap in `server.ts`.
- Added `htmx:source-diff` static guard verifying zero dialect conditionals (`htmxVersion`, `dialect.id ===`, `isHtmx4`) and zero raw `HX-*` strings in application code.
- Added `test:dual-app` browser runner proving 100% behavioral parity across both dialects (OOB counter update, list append, adaptive navigation, error negotiation) from the exact same source. Three real issues were found and fixed during development (JSX-to-Response rendering, SRI integrity blocking same-origin scripts, htmx error-swap divergence).
- Verification: `htmx:source-diff` green, `test:dual-app` both lanes identical, full repo 635/635, typecheck, lint, architecture (74 files), build, docs — all exit 0. Evidence: `evidence/gh-055/verification-transcript.md`.

GH-055 is complete; GH-056 is unblocked.

## 2026-08-22 — GH-056: M3 zero-handler-change dialect-switch gate

- Added the fail-closed `ci:m3` battery: 45 ordered steps, a strict superset of `ci:m2`, adding `htmx:source-diff` (dialect-conditional guard), `test:dual-app` (both-lane browser parity from the unchanged source), `conformance:report` for htmx2 and htmx4-beta6, and the cache/uploads/redirects security audits. Ran end-to-end: 45/45 exit 0.
- Recorded the M3 gate in `delivery/gates/m3.md`: all 17 M3 issues complete with transcripts; the frozen migration contract for later reference apps; no GA claim for htmx 4. Published `docs/compatibility/matrix.md` (side-by-side htmx 2 vs 4 with provisional annotations).
- Evidence: `evidence/gh-056/verification-transcript.md`.

GH-056 is complete; **the M3 milestone is closed**. GH-071 and GH-079 (also awaiting M4's GH-069) are authorized.

## 2026-08-22 — GH-063: flash messages and OOB flash regions

- Added session-backed flash primitives to @bundar/security: `addFlash` (500-char limit, 10-count bound with oldest-dropped, plain text only), `consumeFlash` (single-consumption with FIFO ordering), `peekFlash`. Requires sessionMiddleware.
- Added `FlashRegion` JSX component: accessible with `aria-live="polite"`, severity-mapped ARIA roles (status/alert), data-severity attributes, empty-state placeholder for OOB targetability. Structural props — no jsx→security import (boundary preserved).
- Verified: flash 6/6, flash-region 4/4, full repo 645/645, typechecks, lint, architecture (76 files), pack:inspect ×2, build, docs — all exit 0. Evidence: `evidence/gh-063/verification-transcript.md`.

GH-063 is complete; GH-068 now awaits only GH-066.

## 2026-08-22 — GH-066: security headers, CSP, and nonce propagation

- Added `securityHeaders()` middleware to @bundar/security: per-request nonce via crypto.getRandomValues (unpredictable, request-scoped, never reused); nonce-based CSP with frozen mandatory baseline (default-src 'self', script-src nonce, object-src 'none', base-uri 'self', frame-ancestors 'none'); full header set (nosniff, DENY, referrer, permissions, HSTS, COOP); handler-set CSP appended never replacing mandatory policy; development mode with explicit relaxations.
- `buildCspHeader()` composes the CSP with deterministic ordering; mandatory-directive overrides throw SecurityHeaderError. `getNonce()` provides the request-scoped nonce for script/style helpers.
- Real finding: htmx injects inline `<style>` for `hx-indicator` at runtime — documented; production apps can disable `includeIndicatorStyles` or use the development profile. The local htmx asset loads without `unsafe-inline` for script-src (browser-verified in both lanes).
- Verification: headers 10/10, security:headers audit green, both browser lanes with `csp-headers` scenario, full repo 655/655, typechecks, lint, architecture (77 files), pack:inspect, build, docs — all exit 0. Evidence: `evidence/gh-066/verification-transcript.md`.

GH-066 is complete; **GH-068 (forms and security matrix) is unblocked — all dependencies complete.**

## 2026-08-22 — GH-068: forms and security test matrix

- Added `test:security` (unified 9-audit fail-closed runner) and `security:report` (machine-readable posture report with credential-pattern scanner and residual-risk registry). All 9 security audits green (raw-HTML, validation-redaction, jsx, csrf, cookies, uploads, cache, redirects, headers).
- Added 8 cross-cutting security matrix tests: middleware composition (CSRF+session+headers), nonce propagation, error-negotiation production-safety, action-secret hygiene, and no-credentials-in-artifacts guards. Published `artifacts/security/{test-matrix.json,report.json}`.
- Verification: 9/9 audits, 8/8 matrix tests, full repo 663/663, typecheck, lint, architecture (77 files), build, docs — all exit 0. Evidence: `evidence/gh-068/verification-transcript.md`.

GH-068 is complete; GH-069 (M4 gate) is unblocked.

## 2026-08-22 — GH-069: M4 progressive-workflow security gate

- Built `examples/workflow-gate`: the reference authenticated create/delete workflow composing sessions, session-bound synchronizer CSRF (page renderers issue tokens bound to `session.id`; verification scoped to action routes), `runFormAction` validation, flash, `action`/`actionResponse` PRG/fragment composition, `errorViewResponse` 401/404 negotiation, and `ErrorBoundary` wired through `Bun.serve`'s error hook. Authorization reads only the session — never HTMX metadata.
- Real defect found by the gate and fixed: `csrfMiddleware` rotated the token after EVERY verified unsafe request, including 422s that change no state — a re-rendered form's retry would 403 forever. Rotation now applies only to state-changing (non-4xx) responses; unit- and workflow-tested.
- Added `tests/workflow/reference-workflow.test.ts` (15 tests): real-HTTP cookie-jar client driving ordinary (no-JS PRG) and enhanced (HTMX) lanes, CSRF fail-closed matrix, session isolation, generic-401 content safety, and htmx2/htmx4-beta6 dialect composition.
- Added the fail-closed `ci:m4` battery: 40 ordered steps — every ci:m3 step with the eight individual security audits consolidated into the unified `test:security` runner (step-list diff verified), adding `security:report` and `test:reference-workflow`. Ran end-to-end: 40/40 exit 0; full suite 679/679.
- Recorded the M4 gate in `delivery/gates/m4.md`: all 13 M4 issues complete with transcripts; the frozen workflow composition contract; residual risks documented (token re-render contract, example-only store settings, htmx 4 experimental — no GA claim).
- Evidence: `evidence/gh-069/verification-transcript.md`.

GH-069 is complete; **the M4 milestone is closed**. GH-071 and GH-079 are unblocked; the M5 chain proceeds.

## 2026-08-22 — GH-074: in-process test client and request helpers

- Implemented `@bundar/testing`: `createTestClient` matches and dispatches the compiled route table in-process (no socket) with a per-client cookie jar, form/JSON/multipart request builders, dialect-aware enhanced requests, PRG `follow()`, and one-shot `inject()`. `startTestServer` is the real ephemeral-port opt-in with the SAME client interface; `withRealServer`/`stopAllTestServers` guarantee teardown (port release asserted by rebind).
- Added `buildHtmxRequestHeaders` to @bundar/htmx: dialect-correct request headers with the htmx 4 beta trigger alias carried as adapter metadata (data, not conditionals). Raw protocol strings stay confined to @bundar/htmx — the architecture harness caught a first-draft violation in this branch's tests and it was fixed by asserting through neutral readers and adapter decoders.
- Documented in-process vs real-server semantics: subset route matcher (exact/`:param`/`*`, 405 mirrors Bun); uncaught handler errors REJECT in-process (tests see failures) while the real transport wires Bun's default opaque 500 explicitly.
- Verified: packages/testing 43/43, consumer 4/4, htmx header tests 4/4, full suite 730/730, typecheck, lint, format, architecture (82 files), pack:inspect, api:check (core unchanged), build, docs — all exit 0. Tooling decision: `test:leaks` substitution recorded in the transcript. Evidence: `evidence/gh-074/verification-transcript.md`.

GH-074 is complete; GH-075 (minimal starter template) is unblocked.

## 2026-08-22 — GH-072: development command and reload loop

- Implemented `bundar dev [--entry][--port]`: spawns ONE child (`bun --hot <entry>`, NODE_ENV=development). Bun's hot mode re-evaluates changed modules in the same process and swaps the Bun.serve server on the same port — verified empirically before implementation (same PID, same port, new response; syntax errors print diagnostics while the last-good code keeps serving).
- Added `superviseChild` (packages/cli/src/process/child.ts): inherited stdio, SIGINT/SIGTERM forwarding with SIGKILL escalation after a grace period, exit-code propagation (128+signal; 127 on spawn failure; the promise never rejects), and the intentional-stop marker so Ctrl-C exits 0.
- 13 dev tests including a real-binary integration loop through `bin.ts`: edit → same-port hot swap; broken file → old version serving + process alive; fix applied; SIGINT → clean exit 0. `test:dev-loop` script wired.
- Verified: packages/cli 25/25, full suite 743/743, typecheck, lint, format, architecture (84 files), pack:inspect, api:check, build, docs — all exit 0. Evidence: `evidence/gh-072/verification-transcript.md`.

GH-072 is complete (blocks none; M5 tooling progresses).

## 2026-08-22 — GH-071: create-bundar scaffolding

- Implemented `create-bundar`: templates as code (dialect-correct by construction), fail-closed safety (never overwrites; empty-or-nonexistent targets; npm-safe names), interactive TTY flow + non-interactive flags, and the prominent EXPERIMENTAL notice with the exact htmx 4.0.0-beta6 pin.
- Generated minimal app: pinned Bun engine, TSX config, layout with a LOCAL pinned htmx asset (no CDN), health route, and a progressive subscribe form — the same handlers serve no-JS Post/Redirect/Get and htmx fragments, with 422 invalid-input handling and the app-owned ErrorBoundary.
- `test:scaffold` verifies per dialect end to end: generate → install → typecheck → test → build → RUN → live HTTP assertions (health, home document, asset, PRG 303, enhanced 200 fragment, 422), restoring bun.lock byte-for-byte. Both htmx2 and htmx4-experimental pass.
- The architecture boundary harness caught the planned test location (`packages/cli/test/create`) violating the frozen relative-escape rule; tests relocated to `create-bundar/test/create` (documented substitution). Also caught: template backtick-nesting errors before they could ship.
- Verified: create-bundar 13/13, both scaffold runs, full suite 756/756, typecheck, lint, format, architecture (86 files), pack:inspect, api:check, build, docs — all exit 0. Evidence: `evidence/gh-071/verification-transcript.md`.

GH-071 is complete; GH-075 (minimal starter template) is unblocked.

## 2026-08-22 — GH-075: minimal starter template

- Created `templates/minimal`: the canonical smallest coherent Bundar app — one layout, view-negotiated home, health route, a progressively enhanced subscribe form with real validation (`runFormAction`: no-JS PRG + htmx fragments from the same handlers, 422 field-error region), typed URLs from the generated `routes.gen.ts` (drift-guarded by routes:check), local pinned htmx asset (no CDN), and 5 in-process tests via @bundar/testing. README documents each file's exact purpose.
- `test:template` verifies per variant end to end: install→typecheck→test→build→START with live HTTP assertions. The htmx4 variant is a temporary mount whose ONLY delta is `src/dialect.ts` — enforced by a recursive diff — proving adapter switching touches bootstrap configuration alone; bun.lock restored byte-for-byte.
- Extended `htmx:source-diff` to guard the template alongside the dual-dialect fixture (7 application files, zero dialect conditionals, no raw protocol strings; dist/ bundles excluded — they contain the framework's own htmx internals).
- Verified: both template variants, source-diff, routes:check, full suite 761/761, typecheck, lint, format, architecture, api:check, build, docs — all exit 0. Evidence: `evidence/gh-075/verification-transcript.md`.

GH-075 is complete; GH-076 and GH-077 are unblocked.

## 2026-08-22 — GH-076: Todo reference application

- Built `examples/todo`: deterministic TodoRepository + in-memory impl; validated create/edit (`runFormAction`, 2–200 titles), toggle/delete with 404 negotiation, filters, counts, flash-once, and a view-negotiated list — one handler set for every browser mode under the GH-069 CSRF/session composition contract.
- Enhanced mutations compose the primary item markup + NORMALIZED OOB intents via `serializeUpdates` (counts replace-element; row removals explicit) — zero hand-written OOB markup.
- `test:example` runs three real-HTTP lanes from one source tree: todo:htmx2, todo:htmx4 (temp mount whose ONLY delta is src/dialect.ts — enforced by recursive diff), and todo:no-js (zero HTMX headers, pure PRG). All exit 0; htmx:source-diff now guards the todo tree (13 files total).
- Real @bundar/testing flaws found by this app's tests and fixed: form builders now send `origin` by default (browsers always do; CSRF origin checks fail closed without it) and enhanced methods apply dialect-correct headers without explicit options.
- Verified: example unit 11/11 + standalone strict typecheck, three E2E lanes, full suite 772/772, typecheck, lint, format, architecture, api:check, build, docs — all exit 0. Evidence: `evidence/gh-076/verification-transcript.md`.

GH-076 is complete; GH-080 and (with M7) GH-093 are unblocked.

## 2026-08-22 — GH-077: Admin CRUD reference application

- Built `examples/admin-crud`: versioned ArticleRepository with an append-only audit log; fixture login with server-side role gates (viewer/editor/admin) reading ONLY the session; searchable/filterable/paginated table (plain GET controls — zero-JS usable); inline create/edit with validation and optimistic-concurrency 409 negotiation; admin-only delete; audit feed refreshed as a normalized OOB intent after every mutation; 401/403/404/409 error negotiation without protected-content leakage.
- `security:example-admin` suite (7 tests): direct-URL ↔ enhanced authorization parity, HTMX headers never grant identity, record identity from route params (never hx-target), CSRF fail-closed on all mutations, no internals in any error body.
- `tools/test-example.ts` generalized to six lanes: todo/admin × htmx2/htmx4/no-js — all exit 0; the htmx4 lanes enforce the dialect.ts-only delta by recursive diff. htmx:source-diff now guards the admin tree (20 files total).
- Verified: example 16/16 + security 7/7 + standalone strict typecheck, six E2E lanes, full suite 788/788, typecheck, lint, format, architecture, api:check, build, docs — all exit 0. Evidence: `evidence/gh-077/verification-transcript.md`.

GH-077 is complete; GH-080 and (with M7) GH-093 are unblocked.

## 2026-08-22 — GH-078: HTMX 2-to-4 audit and migration linter

- Implemented `bundar htmx-audit` (`htmx:audit`): static scan of TS/TSX/HTML/JSON for version-sensitive patterns with blocking/review/informational classification, human + JSON reports (file:line evidence, what changed, guidance), CI exit codes (0/1/2; `--fail-on` tunes the threshold), and NO source rewriting (v0.1 contract).
- Rules DERIVE from the pinned dialect profiles (adapter header-alias metadata, approximate event mappings, the v2 inherited-attribute set, official-extension dialectSupport) — the frozen raw-htmx-surface rule enforced this twice during development; both hardcoded-literal slips were refactored to derived data.
- Suppression is explicit and auditable: `bundar-audit-ignore` comments (exact id or family prefix) keep suppressed findings in the report with the suppression's own location; a wrong-rule ignore never silences.
- Fixtures cover every acceptance case; 19 tests incl. end-to-end gates: the sensitive fixture fails (exit 1), the neutral-API todo/admin apps pass with zero blocking findings (honest review advisories), usage errors exit 2.
- Verified: 19/19 audit tests, full suite 807/807, typecheck, lint, format, architecture (89 files), pack:inspect, api:check, build, docs — all exit 0. Evidence: `evidence/gh-078/verification-transcript.md`.

GH-078 is complete; GH-080 is unblocked.

## 2026-08-22 — GH-079: generated API reference and compatibility documentation

- Added `docs:generate`: extracts every public package surface (runtime exports via live import, type exports via source scan) into docs/api/** (7 packages + navigation index, 383 exports each listed exactly once) and regenerates docs/compatibility/versions.md (exact Bun/TS/ESLint/htmx versions from versioned source + the adapter asset registry, with the freshness-owner contract). Experimental markers derive from the beta adapter's own maturity data — idempotent (second run changes nothing; committed state = generated state).
- Added `docs:snippets`: six RUNNABLE documentation modules (lifecycle events, error-boundary opacity, cache policy, validated forms both worlds, CSRF fail-closed, streaming with backpressure) executed by tests/docs/snippets.test.ts — documentation examples cannot rot.
- A snippet's first draft crashed on `cachePolicyFor("fragment")` — an API misuse (it takes a NegotiatedView) now documented correctly in the committed snippet; ergonomics observation recorded.
- Verified: docs:generate idempotent, docs:snippets 7/7, docs:check/api:check/docs:validate/docs:links, full suite 814/814, typecheck, lint, format, architecture, pack:inspect, build — all exit 0. Evidence: `evidence/gh-079/verification-transcript.md`.

GH-079 is complete; GH-080 is unblocked.

## 2026-08-22 — GH-080: getting-started, architecture, security, and HTMX migration guides

- Wrote the four guides: getting-started (no-JS fallback and security as ordered MAIN-PATH sections before deployment, troubleshooting table), architecture (frozen boundaries, pipeline, server-only JSX, honest comparisons incl. an explicit "when NOT to use Bundar" list), security (the GH-069 composition contract's three tested rules, redaction, error opacity, metadata-never-trusted authorization, CSP), and htmx-migration (audit-first procedure with enforced dual-lane verification, bootstrap-only switch, one-file rollback; beta-never-GA throughout).
- Every getting-started TS block is marker-linked to a runnable module under docs/snippets/guides (executed in CI); `test:guides` verifies snippet↔module correspondence, that every documented `bun run` command exists across ALL documented manifests, a no-GA-claim phrase scan, and the main-path section ordering.
- Real defect caught by the new checker: `Set.add(...keys)` silently added one key per manifest (fixed with a loop; the checker now proves its 68+-script collection).
- Verified: test:guides 10/10, full suite 824/824, typecheck, lint, format, architecture, api:check, docs:check/snippets/validate/links, build — all exit 0. Evidence: `evidence/gh-080/verification-transcript.md`.

GH-080 is complete; GH-081 (the M5 usability gate) is unblocked.

## 2026-08-22 — GH-081: M5 developer-experience usability gate

- Built `test:dx-cleanroom`: a scripted fresh-user journey consuming PACKED tarballs — all 7 @bundar packages packed into a local registry (workspace specs rewritten to file: links, covering both workspace:* and bun-pack's bare-0.0.0 forms), a create-bundar app generated against them, then install → typecheck → test → build → routes:generate/check → live HTTP (no-JS PRG, enhanced fragment, 422 with the exact message), and a deliberate route-drift error that must fail with a diagnostic naming the stale artifact. 17 measured steps, exit 0; report at artifacts/dx/m5-report.md.
- Added `test:pack-consumers`: 8/8 publishable manifests verified through pack:inspect.
- Real defects found BY the gate and fixed: the scaffolded app lacked a default App export (route generation failed) and named routes (drift detection impossible) — create-bundar template fixed; scaffold/template/guide batteries re-verified.
- Recorded `delivery/gates/m5.md`: all 11 M5 issues complete with transcripts; **the M5 milestone is closed**; GH-082/GH-084 (M6) unblocked.
- Verified: cleanroom journey, pack-consumers 8/8, docs:snippets, full suite 824/824, typecheck, lint, format, architecture, build, docs — all exit 0. Evidence: `evidence/gh-081/verification-transcript.md`.

GH-081 is complete; **the M5 milestone is closed**. M6 begins with GH-082 and GH-084 unblocked.

## 2026-08-22 — GH-082: complete dual-dialect end-to-end matrix

- Built `test:e2e:release`: the fail-closed 19-suite matrix — template/minimal ×2 lanes, todo ×3, admin-crud ×3, workflow-gate, scaffold ×2 (packed tarballs), real-browser lanes ×3 (normal/boosted/history/forms/errors/OOB/uploads), security suites ×3, the shared-source guard, and a new in-process accessibility smoke (aria-live flash, labeled controls, alert-role errors). **19/19 passed**, exit 0.
- `artifacts/conformance/release-matrix.json`: machine-readable per-suite results with the pinned-asset manifest and the 6 classified htmx4-beta deviations derived from the pinned profile's own migrationDifferences/unsupported records — explicit, never counted as stable-pass.
- Verified: matrix 19/19, source-diff, full suite 827/827, typecheck, lint, format, architecture, api:check, build, docs — all exit 0. Evidence: `evidence/gh-082/verification-transcript.md`.

GH-082 is complete; GH-083 and GH-087 are unblocked.

## 2026-08-22 — GH-083: final alpha performance and regression budgets

- Built `bench:release`: the full suite (27 measurements, 9 parity checks) into artifacts/bench/alpha.json behind a PACKED-CANDIDATE guard (pack-consumers 8/8), with artifacts/bench/environment.json binding every number to Bun/hardware/pins/commit. Headlines on this environment: startup 5.3→16.1ms, RSS 15.7→29.1MB; Bundar tracks raw Bun within low-single-digit µs on routing paths (static 1.2µs, parameterized 1.7µs) and prices the full progressive pipeline at 8.4µs (validated form).
- Built `bench:regression`: fail-closed ratio budgets — same-run Bundar÷raw-Bun ratios pooled over three runs cancel machine load (absolute budgets falsely breached the UNCHANGING raw-Bun/Hono fixtures under load); parity is re-verified from archived snapshots before any budget logic; missing budgets fail; only Bundar-owned ratios are gated (Hono is context, not our regression surface). Stable across three independent probes.
- Published docs/performance/alpha.md: environment-bound results with explicit no-leadership-claims framing.
- Verified: bench chain green ×3 probes, full suite 827/827, typecheck, lint, format, architecture, api:check, build, docs — all exit 0. Evidence: `evidence/gh-083/verification-transcript.md`.

GH-083 is complete; GH-087 is unblocked.

## 2026-08-22 — GH-084: package contents, dependencies, licenses, and size audit

- Built `pack:audit` (+ `pack:all`/`licenses:check`/`secrets:scan` as modes of the one auditor — inventory and checks cannot drift): packs all 8 public packages, inventories every tarball (files, SHA-256, packed/unpacked sizes), scans content for secrets/private paths/fixtures/artifacts, enforces the approved-license set, per-package size budgets, the ADR-0011 zero-runtime-dep claims (verified from PACKED manifests), and the no-external-runtime-deps policy — all fail-closed.
- Result: 8 packages, 513KB unpacked total, **0 findings**, all MIT, all within budget. Machine-readable BOM (artifacts/packages/bom.json, SHA-256 per tarball — the base for GH-085 provenance) + license attribution (artifacts/licenses.json) + the gate record at delivery/gates/package-audit.md.
- Verified: audit + all modes exit 0, full suite 827/827, typecheck, lint, format, build, docs — all exit 0. Evidence: `evidence/gh-084/verification-transcript.md`.

GH-084 is complete; GH-085 and GH-087 are unblocked.

## 2026-08-22 — GH-085: SBOM, provenance, checksums, reproducible builds

- Added `release:sbom`: CycloneDX 1.5 SBOM (artifacts/sbom/sbom.json) — 8 release packages (SHA-256 + licenses from the audited BOM) + all 110 lock-resolved externals with a dependency graph and the lockfile digest; bun.lock's JSONC normalized before parsing.
- Added `release:provenance`: an in-toto/SLSA-shaped statement binding all 8 tarballs (fresh SHA-256s) to source commit, branch, Bun/TS versions, lockfile digest, build command, and builder identity (GitHub Actions fields in CI; local recorded here). Tarballs + sha256sum-compatible checksums.txt archived under artifacts/packages/.
- Added `release:reproduce`: clean-rebuild comparison — every package packed twice, unpacked trees compared file-by-file: 8/8 reproducible. Documented nondeterminism: tarball gzip bytes embed mtimes (content trees are and must be identical).
- Unsigned attestations at current repo capability — no supply-chain assurance level claimed; the statement shape wraps a future signing workflow.
- Verified: all three scripts + `sha256sum -c` 8/8 OK, full suite 827/827, typecheck, lint, format, docs — all exit 0. Evidence: `evidence/gh-085/verification-transcript.md`.

GH-085 is complete; GH-086 and GH-087 are unblocked.

## 2026-08-22 — GH-086: npm publication dry runs and export-map verification

- Built `publish:dry-run` (+ `exports:check` mode): 38 fail-closed checks — pre-release plan simulation (0.1.0-alpha.1 @ alpha, dependency-first order, inter-deps synchronized to the publish form), export-map verification in-tarball (no workspace:/unpublished leaks, metadata + README), clean-consumer install from a file:-linked registry where NESTED manifests may never point at the registry, all 8 entry-point imports (incl. htmx /2 + /4), TSX executing AND typechecking through the installed @bundar/jsx runtime, and the CLI running from its tarball. No registry publish executed.
- Real gap caught: 8 package manifests lacked `repository` publish metadata — added.
- Verified: 38/38 checks, exports:check, pack-consumers 8/8, pack:audit, full suite 827/827, typecheck, lint, format, docs — all exit 0. Evidence: `evidence/gh-086/verification-transcript.md`.

GH-086 is complete; GH-087 is unblocked.

## 2026-08-22 — GH-087: alpha release notes, compatibility statement, known limitations

- Wrote docs/release-notes/alpha.md for v0.1.0-alpha.1: implemented-and-evidenced summary (every claim linked to its gate/artifact), the compatibility statement (Bun >= 1.4.0, htmx 2.0.10 stable/default, htmx 4.0.0-beta6 EXPERIMENTAL with 6 classified deviations and no GA claim, no-JS tested in every lane, Chrome-for-Testing scope, Bun-only runtime), known limitations (pre-1.0 breaking changes, beta-only htmx 4, extension/streaming scope, fixture seams, deployment targets), and upgrade/rollback instructions (alpha dist-tag plan, audit-before-upgrade, one-file dialect rollback, checksum verification).
- Added release:notes-check (+ links:artifacts mode): claims are checked, not trusted — required sections, exact version pins with experimental wording, forbidden beta-as-stable/GA phrasings, link resolution (12 checked), explicit pre-1.0 expectations, rollback presence.
- Verified: notes-check, docs:check/validate/links, full suite 827/827, typecheck, lint, format — all exit 0. Evidence: `evidence/gh-087/verification-transcript.md`.

GH-087 is complete; GH-088 (the release gate) is unblocked.
