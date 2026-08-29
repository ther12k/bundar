# Finding template

Copy this block into `security-review/findings.md` for each finding.
Fields marked REQUIRED must be filled; a finding missing a REQUIRED
field is not accepted into the record. Keep exploit details minimal in
anything that might be public — exploitable findings are reported
privately per `reviewer-instructions.md` §3.

```markdown
## F-<NNN>: <short title>

- **Severity:** P0 | P1 | P2 | P3        (definitions: scope.md)
- **Area:** renderer | requests | sessions/CSRF | HTTP semantics | supply chain
- **Status:** open | reported-privately | fixed | wontfix | accepted-risk

### Affected code (REQUIRED)

File/symbol and the commit SHA reviewed, e.g.
`packages/jsx/src/render/attributes.ts#serializeAttribute()` @ <sha>.

### Description (REQUIRED)

What is wrong, in one paragraph. Cite the documented guarantee it
contradicts, if any.

### Reproduction (REQUIRED)

- Preferred: minimal runnable reproduction (file + command using
  `@bundar/testing` or `bun test`).
- Alternative: a concrete code-trace argument naming the exact
  branch/line where the guarantee breaks, and why no other layer
  catches it.

### Impact (REQUIRED)

What the adversary gains, bounded honestly (no inflation).

### Preconditions (REQUIRED)

Configuration, flags, network position, or application mistakes needed.
"None beyond defaults" is a meaningful answer — use it when true.

### Recommended fix (REQUIRED)

Direction, not a patch: the invariant to restore or add.

### Regression test sketch (REQUIRED)

What test would have caught this and where it belongs (which suite/file).

### Release disposition (REQUIRED)

One of:
- **Block 1.0 / publication** (P0)
- **Fix before RC freeze** (P1)
- **Scheduled correction** — target milestone (P2)
- **Accepted risk** — with the accepting maintainer and rationale (P2/P3)

### Evidence

Links: commits, test runs, screenshots, private-report date (no
exploit text in the repository).
```

## Coverage summary template (top of findings.md)

```markdown
# GH-177 independent security review — findings

- Reviewer: <name/handle>
- Independence statement: <which subsystems, if any, you touched before>
- Commit reviewed: <git rev-parse HEAD>
- Period: <start> – <end>

## Coverage

| Area | Depth (deep/standard/shallow) | Attempted attacks / traces | Findings |
| --- | --- | --- | --- |

## Summary

<narrative: what holds, what does not, what you would watch before 1.0>
```
