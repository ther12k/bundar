# @bundar/schema

Bundar's Standard Schema validation adapter (GH-058).

- Purpose: validate params, query, headers, forms, and JSON through any
  [Standard Schema v1](https://standardschema.dev)-compatible validator —
  Zod, Valibot, ArkType, or your own — without Bundar choosing, wrapping, or
  shipping one. `@bundar/core` has zero dependencies on this package; apps
  that never validate never install it.
- Boundaries: may import `@bundar/core` (request sources, bounded parsers)
  and `@bundar/jsx`; nothing imports `@bundar/schema` except applications.
- Runtime dependencies: `@bundar/core` (workspace) only.

## API

```ts
import { validateForm, validateQuery } from "@bundar/schema";
import { z } from "zod"; // any Standard Schema validator works

const userSchema = z.object({
  name: z.string().min(1),
  age: z.coerce.number().int(), // coercion belongs to the validator
});

app.post("/register", async (context) => {
  const result = await validateForm(context, userSchema);
  if (!result.success) return renderErrors(result.issues);
  const user = result.value; // typed as the schema's output
  return text(`hi ${user.name}`);
});
```

- `validateSchema(schema, value)` — the adapter core: accepts sync or async
  schemas, normalizes issues to `{ message, path: PropertyKey[] }`, and keeps
  each library-specific original issue on `raw` as the explicit escape hatch.
  Nonconforming schemas fail closed with `SchemaDialectError`.
- `validateForm` / `validateJson` — consume the body once through the bounded
  parsers (double reads fail with `BodyConsumedError`, never silently);
  schemas only ever see decoded data.
- `validateQuery` / `validateParams` / `validateHeaders` — lazy per-request
  reads; repeated query keys map to string arrays.

Validation-result rendering data (field errors for progressive forms) lands
with GH-059.
