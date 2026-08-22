# Delivery

- [Backlog Summary](backlog-summary.md) — Milestone-level backlog inventory and issue-size philosophy for the generated GitHub-ready tasks.
- [Beta Readiness Definition](beta-definition.md) — Conditions beyond alpha required before Bundar may be described as beta-ready.
- [Issue Dependency Graph and Execution Waves](dependency-graph.md) — Topological execution model, stable issue IDs, parallel waves, blocking policy, and graph validation.
- [Complete Issue Dependency Ledger](dependency-ledger.md) — Generated topological order, parallel execution waves, direct dependencies, and reverse blocking edges for all Bundar microtasks.
- [Milestone Definitions and Exit Criteria](milestones.md) — Detailed objectives, deliverables, exclusions, and gate owners for each implementation milestone.
- [M0 Contract-Freeze Gate](gates/m0.md) — Evidence-backed contract authorization and accepted residual risks for M1–M3 foundations.
- [M1 Performance and Resource Gate](gates/m1-performance.md) — Measured M1 HTTP-core overhead against raw Bun and pinned Hono baselines with reviewed tolerances, trade-offs, and tracked optimization follow-ups.
- [M3 Zero-Handler-Change Dialect-Switch Gate](gates/m3.md) — Maintainer acceptance that htmx versions are isolated behind adapters, verified by the unchanged-source dual-dialect fixture across both browser lanes.
- [M1 HTTP-Core Gate](gates/m1.md) — Maintainer acceptance of the Bun-native HTTP core foundation, reviewed M0 deviations, and authorization of M2/M3 dependent work.
- [M2 Server-JSX Gate](gates/m2.md) — Maintainer acceptance of the server-only JSX renderer as the stable rendering foundation, with reviewed raw-HTML policy, streaming limitations, and the approved public surface.
- [M2 JSX Performance and Memory Gate](gates/m2-performance.md) — Renderer-level measurements across seven JSX scenarios with parity pre-checks, enforced escaping, cold/steady separation, memory proxies, and reviewed regression budgets.
- [Release and Rollback Plan](release-plan.md) — Pre-release sequence, artifacts, publication checks, rollback, advisories, and compatibility communication.
- [Bundar Risk Register](risk-register.md) — Product, technical, compatibility, security, performance, naming, ecosystem, and delivery risks with mitigations.
- [Bundar Implementation Roadmap](roadmap.md) — Milestone sequence from contracts to alpha and stable htmx 4 support.
- [Workstreams and Ownership Model](workstreams.md) — Parallel engineering workstreams, interfaces, coordination points, and recommended reviewer skills.
