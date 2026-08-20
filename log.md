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
