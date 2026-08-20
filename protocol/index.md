# HTMX Protocol

- [HTMX 2 and HTMX 4 Compatibility Matrix](compatibility-matrix.md) — Feature-level mapping, portability classification, and Bundar handling strategy across HTMX major versions.
- [HTMX Dialect Conformance Suite](conformance-suite.md) — Fixture format, browser matrix, behavioral assertions, source pinning, and evidence for protocol compatibility.
- [HTMX Dialect Interface](dialect-interface.md) — Version-neutral adapter contract implemented by htmx 2 and htmx 4 profiles.
- [HTMX 2 Stable Profile](htmx2-profile.md) — Default Bundar protocol profile, tested behaviors, compatibility shims, and known constraints for htmx 2.
- [HTMX 4 Profile and GA Readiness](htmx4-profile.md) — Experimental profile based on htmx 4 beta6, changed semantics, adapter behavior, and conditions for stable support.
- [HTMX 2 to HTMX 4 Migration Contract](migration-contract.md) — Concrete zero-change goal, source restrictions, switch procedure, test gates, and fallback strategy for moving Bundar applications to htmx 4.
- [Normalized HTMX Request Metadata](normalized-request.md) — Canonical request representation independent of HTMX 2 and HTMX 4 header differences.
- [Normalized HTMX Response Directives](response-directives.md) — Canonical server directives for navigation, history, target, swap, selection, refresh, and client events.
- [Bundar Stable HTMX Subset](stable-subset.md) — Conservative attributes and behaviors that receive the zero-application-change HTMX 2 to 4 migration guarantee.
- [Version-Neutral Multi-Region Update Intents](update-intents.md) — Canonical model for replacing, appending, removing, and otherwise updating multiple DOM regions across HTMX dialects.
