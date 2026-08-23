---
name: Agent task
about: Bounded implementation task for a coding agent (BR-049 contract)
labels:
  - status:proposed
---

<!--
  MANDATORY before applying the `agent-ready` concept: every field below
  must be filled. An issue missing any field is NOT safe for low-context
  agents and the validator (bun run issues:check) will reject it.
-->

# <BR-NNN / GH-NNN> — <title>

## Outcome

<one sentence describing the finished state>

## Read set

<!-- files sufficient to understand the change; never "the whole repo" -->

-

## Write set

<!-- files this task may modify -->

-

## Focused checks

<!-- smallest command set proving closure; exit 0 required -->

```bash
```

## Full gate

<!-- repository-wide gate required before merge, e.g. bun run ci:release -->

## Forbidden changes

<!-- absolute guardrails; contradicting evidence → STOP and open a decision note -->

- Do not weaken an existing gate, skip a mandatory test, or turn a failure into a warning.

## Parallel safety

parallel_safe: <!-- yes|no -->
conflicts_with: <!-- issue numbers or "none" -->

## Human gate

human_gate: <!-- none | decision | credentials | release authority -->

## Closure report

The closing comment MUST include:

1. Actual files changed (may deviate from write_set only with justification)
2. Actual commands executed and their exit statuses
3. Deviations from the planned sets, each justified

## Stop rule

If source evidence contradicts acceptance criteria or a forbidden change is
required, STOP and open a decision/blocker note instead of weakening this
contract.
