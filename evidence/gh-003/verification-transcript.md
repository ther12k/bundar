# GH-003 Verification Transcript

## Environment

Bun 1.4.0, TypeScript 6.0.3, yaml 2.9.0 (validator frontmatter parsing),
Ubuntu 24.04.4 LTS (kernel 7.0.0-28-generic, x86_64). Recorded 2026-08-21 on
branch `gh-003-okf-corpus-validator`.

## Planned verification block

```text
$ bun run docs:validate
docs:validate: ok (205 documents, 96 issues, local structural validation only — it is not certification by Google or any third party)
  -> exit 0

$ bun run docs:links
docs:links: ok (1031 links across 205 documents)
  -> exit 0

$ bun run issues:graph
issues:graph: 96 issues, 213 dependency edges, no cycles
  graph roots: GH-001
  -> exit 0
```

The counts reproduce `delivery/dependency-ledger.md` exactly (96 stable
issues, 213 dependency edges, cycle check PASS, single graph root GH-001),
now verified mechanically against the issue files themselves rather than
trusting the generated ledger.

## Implementation notes

- The bundle root is the **repository root**: `index.md` already declared
  `okf_version: "0.2"`, and `log.md` is the reserved bundle log, so the corpus
  stays single-sourced instead of duplicating ~205 files under `docs/okf/`.
  `docs/okf/README.md` documents the layout and validator ownership.
- Corpus: `architecture/`, `decisions/`, `delivery/`, `engineering/`,
  `github/`, `issues/`, `project/`, `protocol/`, `references/` plus root
  concepts `README.md`, `MASTER_AGENT_PROMPT.md`, `bundle-report.md`.
- `tools/okf-validator/` implements the three commands over `corpus.ts`
  (discovery, frontmatter via the `yaml` package) and `rules.ts` (pure
  rules: root metadata, reserved-file conventions, non-empty concept types,
  link resolution, unique `GH-###` stable IDs, dependency existence, cycle
  detection).
- Tests: 14 total (10 new) — synthetic adversarial cases (duplicate IDs,
  unknown dependencies, cycles, broken links, empty types, reserved-file
  misuse) plus a whole-corpus integration test pinning that the real bundle
  validates clean. CI gains `.github/workflows/docs.yml`.
- `CONTRIBUTING.md` battery extended with `docs:validate` and
  `issues:graph`.

## Regression battery

`bun install --frozen-lockfile`, `format:check`, `lint`, `typecheck`,
`bun test` (14 pass / 0 fail), `build`, `docs:check` — all exit 0.

## Residual risks and deviations

- Link extraction skips Markdown code fences; the current corpus does not
  rely on links inside fences. If that changes, the extractor must learn
  fence skipping.
- Validation is structural only; `status: stable` on reference documents
  does not imply implementation proof (governance rule from
  `references/okf-v0.2.md` and `project/requirements.md`).
