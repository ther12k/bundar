# docs/okf

The Bundar repository is itself an OKF v0.2 bundle; the bundle root is the
repository root, installed by GH-003.

## Bundle layout

- `index.md` (repository root) — reserved bundle index declaring
  `okf_version: "0.2"`.
- `log.md` (repository root) — reserved chronological event log.
- Concept directories: `architecture/`, `decisions/`, `delivery/`,
  `engineering/`, `github/`, `issues/`, `project/`, `protocol/`,
  `references/`; every `index.md` inside them is a reserved navigation file.
- Root concepts: `README.md`, `MASTER_AGENT_PROMPT.md`, `bundle-report.md`.
- Operational files (`CONTRIBUTING.md`, `SECURITY.md`, `SUPPORT.md`,
  `CODE_OF_CONDUCT.md`, `MAINTAINERS.md`, `evidence/`, package and tool
  sources) are outside the corpus.

## Local validator

`tools/okf-validator/` implements structural validation per
`references/okf-v0.2.md`:

```bash
bun run docs:validate   # frontmatter, reserved files, root metadata, links, issue graph
bun run docs:links      # internal link check only
bun run issues:graph    # issue ID, dependency, and cycle summary
```

These commands run in CI (`.github/workflows/docs.yml`) and are pinned by
unit plus whole-corpus tests in `tools/okf-validator/okf-validator.test.ts`.

Validation output always states that it is local structural validation, not
external certification by Google or any third party.
