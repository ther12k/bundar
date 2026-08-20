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
