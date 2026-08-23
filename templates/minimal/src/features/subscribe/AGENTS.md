# subscribe slice — agent map

Purpose: progressive email-subscribe form; one handler set for no-JS PRG and htmx fragments.
Public entrypoint: subscribe.routes.tsx (`registerSubscribeRoutes`). Contracts: route names `home`, `subscribe`; DOM ids `subscribe-form`, `email-error`, `subscribed`.

Allowed imports: routes → schema/types/view (+ framework); view → types only.
Read zones: this directory + src/layout.tsx + src/routes.gen.ts. Write zones: this directory.

Checks:
- bun run typecheck && bun test

Escalate when: validation semantics change (GH-058 contract) or routes.gen regeneration is required.

Details: ../../../engineering/application-structure.md
