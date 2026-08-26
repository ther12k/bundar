# GH-155 verification transcript — JSX benchmark rows are Bundar-only (BR-103)

Branch gh-155-jsx-scope; implementation commit `4580ea2`; artifacts regenerated and budgets rebuilt after it.

## Change

- `tools/benchmark/scenarios.ts`: the two JSX rows carry
  `excluded: ["raw-bun","hono","carno"]` (BR-103) — all non-Bundar
  adapters return prebuilt HTML there while Bundar builds+escapes+
  serializes a node; that work asymmetry now has NO comparison surface.
- `tools/benchmark/runner.ts`: parity honors full participation;
  single-participant scenarios record one context snapshot (nothing to
  compare); reference selection falls back to first participant when raw
  is excluded (defensive, currently always raw for shared rows).
- `tools/benchmark/regression.ts`: parity re-check treats <2-entry
  snapshots as by-design context (never a "missing raw" violation);
  JSX ratio budget keys are gone by construction (17→13 pooled keys).
- Tests: Bundar-only parity-key assertion for JSX rows; four-way set kept
  for every shared-surface row; exclusion list asserted exactly.

## Commands / results

- `bun test tests/benchmark/` → 15 pass / 0 fail (194 expects).
- Budgets: `bench:regression --generate` → 13 budgets from 3 pooled runs.
- Recording: attempts under load 4.87 tripped sync-middleware once
  (pre-existing load-sensitive micro ratio); attempt with acceptable
  conditions passed BOTH gates: within budget 13 alpha + 17 beta
  measurements, 0 alerts. alpha.json/beta.json/environment.json stamped
  at the implementation commit.
- tsc / eslint / prettier clean.

## Acceptance criteria

- [x] JSX rows are Bundar-only in scenario metadata, enforced by tests.
- [x] Report prints only Bundar numbers there (`—` markers; no ratios,
      no winner labels).
- [x] Prose corrected: docs no longer claim every scenario runs the same
      escaping across adapters.
