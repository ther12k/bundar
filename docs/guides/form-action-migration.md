# Migrating form actions to the facade

The legacy shape fuses mutation and rendering in one callback named
`fragment`. The facade separates them. The transformation is mechanical.

## Before

```ts
const outcome = await runFormAction(
  context,
  {
    schema,
    action: {
      fragment: (input) => {
        const result = store.create(input.title);
        return renderTodo(result);
      },
      redirectTo: "/todos",
    },
    renderForm: (render) => (
      <TodoForm
        title={String(render.submitted["title"] ?? "")}
        error={render.errors.first[0]?.message ?? ""}
      />
    ),
  },
  { dialect },
);
return outcome.response;
```

## After

```ts
const forms = createFormActions({ dialect });

const createTodo = defineFormAction({
  schema,
  run: ({ title }) => store.create(title),
  success: {
    fragment: (todo) => renderTodo(todo),
    redirectTo: "/todos",
  },
  invalid: {
    fragment: ({ field }) => {
      const title = field("title");
      return <TodoForm title={title.value ?? ""} error={title.error ?? ""} />;
    },
  },
});

app.post("/todos", forms.handle(createTodo));
```

## Mechanical mapping

| Legacy | New facade |
| --- | --- |
| `action.fragment(input)` mutates and renders | `run(input)` mutates; `success.fragment(result)` renders |
| `{ dialect }` on each call | `createFormActions({ dialect })` once |
| `renderForm` | `invalid.fragment` |
| `renderInvalidDocument` | `invalid.document` |
| `formTarget` | `invalid.target` |
| `outcome.response` | `forms.handle()` returns the Response |
| `render.errors.first` | `field(name).error` |
| `String(render.submitted[name])` | `field(name).value` / `.values` |
| low-level outcome inspection | `forms.execute()` |

## Compatibility

`runFormAction()` remains supported as the low-level/legacy surface during
the documented pre-1.0 compatibility window. Existing applications are not
required to migrate immediately. The new facade is the preferred
application-level API for newly written validated form actions. Removing
`runFormAction()` is an explicit non-goal of the current epic, and the
legacy reference applications keep passing.
