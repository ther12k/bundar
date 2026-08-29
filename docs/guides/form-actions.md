# Form actions

The preferred application-level API for validated forms:
`defineFormAction()` describes the workflow, `createFormActions({ dialect })`
binds delivery once, `forms.handle()` returns the composed `Response`.

## Mental model

```
validated input
  → run() performs business work
  → domain result
  → success.fragment() renders it
  → ordinary redirect or enhanced fragment
```

The invariant, stated plainly:

- `run(input, context)` → `Result` — execution. It may mutate, add flash
  messages, and read post-mutation state. It runs exactly once, inside the
  transaction hooks when configured.
- `success.fragment(result, context)` → HTML — presentation. It renders
  ONLY the result it receives; it never queries or mutates.

The anti-pattern the separation exists to prevent:

```ts
// WRONG: a callback named for presentation performing business work
success: {
  fragment: (input) => {
    const result = mutate(input);
    return render(result);
  },
}
```

`Result` is the boundary between execution and rendering. Returning
everything the renderer needs (including post-mutation reads such as
counts) keeps `success.fragment()` pure — see the
[Todo walkthrough](../examples/todo.md).

## Define a form action

```ts
const createTodo = defineFormAction({
  schema: todoSchema,            // Standard Schema v1 — Input is inferred
  run: ({ title }) => store.create(title),  // Result is inferred from run()
  success: {
    fragment: (todo) => renderTodo(todo),
    redirectTo: "/todos",        // ordinary browsers: Post/Redirect/Get
  },
  invalid: {
    fragment: ({ field }) => renderForm({ title: field("title") }),
    target: "#todo-form",        // server-known region for enhanced errors
  },
});
```

`defineFormAction()` is an identity helper: its whole job is inference.
Input flows from the schema, `Result` flows from `run()` straight into
`success.fragment()`. Nothing is frozen, cloned, or normalized.

## Bind the dialect once

```ts
const forms = createFormActions({ dialect });
```

Call it once at registration time; every form action shares the binding.
Repeating per-route dialect options is the legacy shape.

## handle() versus execute()

The common route path is `handle()` — it returns the composed `Response`
directly:

```ts
app.post("/todos", forms.handle(createTodo));
```

Code that needs the discriminated outcome uses `execute()`:

```ts
const outcome = await forms.execute(context, createTodo);
if (outcome.kind === "invalid") {
  // optional advanced handling
}
return outcome.response;
```

`handle()` is the default application API. `execute()` is for interceptors,
audit layers, and tests that observe which path ran.

## Invalid fragments and documents

`invalid.fragment(render, context)` re-renders the form region for
enhanced requests; the framework pairs the server-known `invalid.target`
with a retarget + outerHTML reswap. `invalid.document(render, view,
context)` re-renders the full application document for ordinary (no-JS)
requests; when omitted, a generic error document with a field-error
summary is used — with no dangling field anchors.

## Field helpers

Inside invalid renderers, `field(name)` exposes one field's submitted
values and errors without coercion. See the
[validation guide](./validation.md) for the exact view shape and the
multi-value guarantees.

## Transactions

`transaction?: { begin, commit, rollback }` brackets the valid path:
`begin` → `run()` → fragment resolution → `commit`. A failure of `run()`
OR fragment rendering rolls back exactly once and rethrows; a cancellation
after `begin` also rolls back — an abort can never strand an open
transaction, and uncommitted work is never committed after the signal
fires.

## Cancellation

The workflow checks `context.signal` before parsing, around validation,
before the transaction opens, after `run()`, and after fragment
resolution. Post-mutation aborts route through rollback — never a commit.

## Low-level runFormAction()

`runFormAction()` remains supported as the low-level/legacy surface during
the documented pre-1.0 compatibility window. Existing applications are not
required to migrate immediately; the facade is the preferred
application-level API for newly written validated form actions. See the
[migration guide](./form-action-migration.md) for the mechanical
transformation, and the [API reference](../api/forms.md) for the full
surface.
