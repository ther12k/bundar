# GH-177 review scope

Independent security review of the high-risk subsystems before 1.0,
per GH-177: performed by a security-minded engineer **who did not write
the subsystem being reviewed**. No expensive certification is required —
a competent, skeptical manual pass with working reproductions is the bar.

This packet (all files in `security-review/`) was prepared so the
reviewer can spend their time judging, not orienting. It intentionally
does NOT contain findings, verdicts, or risk acceptances: those are the
reviewer's output.

## Areas in scope

The area list below is the GH-177 contract, expanded with the concrete
sub-surfaces each area covers.

1. **JSX escaping and the raw-HTML trust boundary** — text/attribute/RCDATA
   serialization, the `raw()` branded sink, attribute-name validation,
   URL-attribute scheme checks, async rendering, streamed late errors,
   chunking, and cancellation during render.
2. **Request and form handling** — body limits and malformed encodings,
   duplicate-field semantics, multipart/upload limits and filename
   handling, retained-value redaction on validation failure, abort
   behavior, transaction rollback exactly-once semantics.
3. **Sessions and CSRF** — session-id generation and rotation, the store
   contract and its atomicity requirements, sliding/absolute expiry,
   cookie attributes, duplicate-cookie handling, origin checks, CSRF
   token binding and one-time consumption, logout and concurrency.
4. **HTTP semantics** — redirects, HEAD/OPTIONS/Allow, Vary and cache
   policy, proxy trust and origin normalization, host handling, error
   boundaries and redaction, security headers/CSP.
5. **Release supply chain** — candidate identity binding, tarball
   integrity, SBOM/provenance/reproducibility, GitHub workflow trust
   boundaries, npm publication path, post-publish byte verification,
   rollback/deprecation tooling.

## Out of scope

- Performance budgets and benchmark policy (governed separately; not a
  security surface).
- Browser-conformance completeness (covered by the compatibility matrix
  and its evidence; the reviewer may flag a security-relevant gap if one
  is noticed, but re-running browser lanes is not required).
- The documentation website build (Astro/Starlight site under
  `website/`) beyond the content-sync hygiene gate.
- Any attempt to exploit, attack, or probe systems outside this
  repository (no third-party services, no npm live publication — the
  publication path is reviewed as code plus rehearsal evidence only).

## Priority definitions (used for every finding)

| Level | Meaning |
| --- | --- |
| **P0** | Publication/runtime blocker — exploitable or data-integrity-breaking; must be fixed before any release action |
| **P1** | Must fix before RC — real weakness with credible preconditions; fix or documented mitigation required before the 1.0 RC freeze |
| **P2** | Accepted risk or scheduled correction — real but low-impact/high-cost; needs an explicit disposition, not silence |
| **P3** | Cleanup/hardening — worth doing; no release gate impact |

## Success criteria

- Every in-scope area has been read by the reviewer with the specific
  questions in `reviewer-instructions.md` in mind.
- Findings are recorded in `security-review/findings.md` using
  `finding-template.md`, each with a reproduction or a concrete
  code-trace argument.
- Each finding carries a release disposition.
- The review record (scope, reviewer, findings, dispositions) is
  referenced from the GH-177 thread and the repository log.
