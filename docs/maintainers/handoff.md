# Maintainer handoff — current state and hold rules

Status page for the maintainer. Written 2026-08-29 after the last
agent-executable wave. For every wave's evidence see [log.md](../../log.md);
for the review packet see [security-review/](../../security-review/scope.md).

## Current state

**Agent-executable issues: 0.** Everything still open is gated on
external judgment, human authority, or the release chain. All 12 open
issues fall in one of the groups below:

| Group | Issues | Gate |
| --- | --- | --- |
| External participant | #177 independent security review, #135 usability study | a reviewer who did not author the subsystems |
| Human authority | #130 npm identity/credentials/approval | maintainer only |
| Release chain | #132 canary (→ #130), #133 external consumer (→ #132), #134 migration fixture (→ candidate), #136 beta gate (→ chain) | prior gate in the chain |
| M9 sequenced | #173 API freeze, #174 dogfood, #175 soak | held behind review/canary per the maintainer freeze |
| Terminal | #179 RC + stable 1.0.0 | everything above |

**Waiting on:**

- #177 — independent security reviewer
- #130 — npm identity/approval
- #132 — first live canary
- #178 — publishing-guide finalization (stage 2, after the canary)

**Last verified battery at the time of writing:** run 33247265939 on
main `693a918`, bundle digest
`sha256:1727b003736d7ed6f7ef85b3b694a1d6ae89930b0a70485b9a0859311e04f2bf`.
Docs-only commits after it (this page, log entries) do not change
package bytes — but **any publication re-runs the battery on the exact
SHA being published**. A battery bound to a different SHA is not
reusable. Fail-closed SHA binding is a feature, not friction.

## Freeze — do not touch before canary or review demand

route API · middleware API · form-action facade · session contract ·
JSX contract · testing facade · package exports · CLI surface ·
generated typed URLs · release candidate format.

Not wanted before beta evidence: ORM adapters, auth subsystems,
component kits, new browser engines, alternative syntaxes.

## Allowed before canary

1. Blockers found by the independent security review (#177).
2. Blockers found by the Candidate Release Battery.
3. Publication/registry blockers.
4. Factual documentation corrections.
5. Proven flaky-test or infrastructure corrections.
6. Urgent security response.

## Do not

- publish from local tarballs (bundle bytes only);
- reuse a battery from another SHA;
- close #177 using implementation-agent or AI-assistant review;
- close #178 before real canary evidence exists;
- add new framework features before beta evidence.

## Bundle preflight — exact command (both flags required)

```bash
bun run registry:verify -- \
  --preflight \
  --manifest /path/to/bundle/artifacts/release/candidate-manifest.json \
  --root-dir /path/to/bundle
```

Operator warning: omitting `--manifest` makes the verifier load the
repo-local manifest and hash bundle bytes against it — spurious
"[disk] SHA-256 mismatch" noise. The bundle's own manifest, the
candidate-identity record, and its nine tarballs are internally
consistent; verify them as one unit. The same pairing applies to
`publish:approved --dry-run` (`--manifest` + `--tarball-root`).

## #177 reviewer handoff package

Hand the reviewer: the exact review SHA (newest main commit with a
green battery recorded in log.md), the
[security-review/ packet](../../security-review/scope.md), the
[support matrix](../compatibility/support-matrix.md), [SECURITY.md](../../SECURITY.md),
[known residual risks](../../security-review/known-residual-risks.md),
the battery run ID + artifact digest, and the public package surfaces.

Required reviewer outputs per finding: finding ID, severity P0–P3,
affected boundary, reproduction, impact/preconditions, recommended
correction, regression requirement, release disposition.
Handling: P0 → publication blocked; P1 → RC blocked; P2 → fix or
explicit accepted risk; P3 → cleanup. The packet is a map, not a
verdict — do not pre-answer it.

## Human sequence after the hold

1. **#177** — independent reviewer executes the review (above).
2. **#130** — npm scope ownership, `create-bundar` name, trusted
   publishing/OIDC or restricted credentials, npm-publish environment
   with required reviewer, self-approval prevented, deployment branch
   restricted to protected main, revocation procedure verified, fresh
   exact-tip battery, run ID + digest recorded.
3. **#132** — fresh battery on the exact publish SHA → record run ID +
   digest → release workflow `dry_run_only=true` → human reviews the
   exact bundle → live approval → `registry:verify --download`.
4. **#178 stage 2** — record the commands/workflow that actually
   worked, auth/trusted-publishing behavior, registry verification
   report, deprecation/rollback rehearsal, corrections from real
   incidents; move the publishing guide from draft to operationally
   verified; close the last two checkboxes; then close #178.
5. **Beta chain** — #133 → #134 → #135 (independent participants;
   implementers cannot prove learnability) → #136 go/no-go.
6. **#179** — only after #177, #130/#132, #178, and #133–#136 are
   done. Candidate freeze, rc.1, stable migration, soak, rollback
   rehearsal, and the `latest` publication are terminal, human-gated
   work.

If no external reviewer or npm approval is available, the repository
stays quiet. That is the honest state — no new issues should be
invented to keep an agent moving.
