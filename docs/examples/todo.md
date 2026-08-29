# Todo reference application — architecture walkthrough

The Todo app (`examples/todo`) is the reference for a complete progressive
workflow: validated create/edit/toggle/delete, filters, counts, flash,
out-of-band updates, history-friendly PRG, and a no-JS fallback — one
handler set for every browser mode.

## Separated form actions

Create and edit run on the separated facade — `createFormActions({ dialect })`
bound once in `registerTodoRoutes`. The create action shows the
mutation/result/render split:

```ts
run: ({ title }, context) => {
  const item = repository.create({ title });
  addFlash(context, "success", `Added "${item.title}".`);
  return { item, counts: repository.counts() };  // post-mutation reads travel in the result
},
success: {
  fragment: ({ item, counts }) =>
    enhancedFragment(todoItem({ item, token: "" }), counts),
},
```

The renderer consumes the result without querying or mutating. Edit goes
further with a discriminated domain result:

```ts
type RenameTodoResult =
  | { kind: "renamed"; item: Todo; counts: TodoCounts }
  | { kind: "not-found" };
```

`run()` decides what happened; the result records that decision;
`success.fragment()` decides how it looks (the renamed item fragment, or
the not-found region). This is preferable to rendering or throwing from
the mutation callback: the repository decision stays data.

Toggle and delete intentionally remain on direct action composition —
they are not validated forms, so the validated-form facade would widen,
not clarify, their contracts.

## The moving parts

```
examples/todo/src/
 domain.ts  TodoRepository interface + deterministic in-memory impl
 app.ts   routes, form actions, CSRF/session composition, OOB intents
 layout.tsx shared JSX regions (layout, counts, filters, item, form)
 dialect.ts the ONE dialect decision (bootstrap-time only)
 main.ts   production bootstrap (app-owned ErrorBoundary)
 app.test.ts both browser modes from one in-process client fixture
```

- **Domain** — `TodoRepository` is six methods over `Todo` records; the
 in-memory implementation is deterministic (injectable clock, sequential
 ids) so tests never race the wall clock. A SQLite backing implements the
 same interface; handlers never change.
- **Composition** — the workflow contract: `sessionMiddleware`
 globally; `csrfMiddleware` scoped to the action group so page renderers
 issue session-bound synchronizer tokens (hidden field + cookie, bound to
 `session.id`); a 422 re-render keeps the token valid for the retry.
- **Validation** — `runFormAction` with a Standard Schema: identical rules
 for ordinary (PRG 303) and enhanced (fragment) submissions; invalid
 titles re-render the form with the field error at 422.
- **Out-of-band updates** — mutations serialize the counts region (and row
 removals) as NORMALIZED update intents via `serializeUpdates`: target id
 + explicit replace/remove operation. No hand-written `hx-swap-oob`
 markup exists in application code; the adapter owns the dialect shape.
- **Dialect switching** — `dialect.ts` is the only file that changes
 between the htmx2 and htmx4-beta lanes (enforced by the E2E harness's
 recursive diff); `htmx:source-diff` guards the tree against version
 conditionals and raw protocol strings.

## Verify

```bash
bun test examples/todo         # both modes, in-process
bun run test:example -- todo:htmx2   # real HTTP, stable lane
bun run test:example -- todo:htmx4   # experimental lane (dialect.ts swap)
bun run test:example -- todo:no-js   # zero HTMX headers, PRG only
bun run htmx:source-diff examples/todo # guarded with the fixture + template
```

The fixture is single-user with an in-memory store: fine for a reference,
not a production posture (see the sessions guide for durable stores).
