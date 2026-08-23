# todos slice — agent map

Purpose: deterministic todo CRUD with flash feedback; identical validation for PRG and htmx, multi-region OOB updates via normalized intents.
Public entrypoint: todos.routes.ts (`registerTodoRoutes`). Contracts: route names `todo-*`; DOM ids `todo-list`, `todo-counts`, `filters`, `flash`.

Allowed imports: routes → schema/types/repository/view + security helpers; view → types only; repository never imports HTTP/UI.
Read zones: this directory + ../../layout.tsx. Write zones: this directory.

Checks:
- bun test (from examples/todo)
- bun run app:arch .

Escalate when: repository port signature changes or CSRF composition order must differ from GH-069.

Details: ../../../engineering/application-structure.md
