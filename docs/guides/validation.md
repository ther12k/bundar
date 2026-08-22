# Validation guide

Bundar validates request data through the [Standard Schema
v1](https://standardschema.dev) interface: any conforming validator works,
and Bundar ships — and requires — none. `@bundar/core` never depends on
`@bundar/schema`; apps that skip validation skip the package entirely.

## Sources and mapping

| helper | input passed to the schema | notes |
| --- | --- | --- |
| `validateForm(context, schema)` | form fields as a record; repeated keys become `string[]` | body read once by the bounded parser (GH-057); a second read fails with `BodyConsumedError` |
| `validateJson(context, schema)` | the parsed JSON value | same single-consumption guarantee |
| `validateQuery(context, schema)` | query record; repeated keys become `string[]` in submission order | lazy, per request |
| `validateParams(context, schema)` | the decoded route params record | router-decoded |
| `validateHeaders(context, schema)` | headers record, lowercased keys | per request |

Coercion is the validator's responsibility. Bundar passes plain decoded
data in and returns the schema's typed output untouched — `z.coerce.number()`
turns form strings into numbers, not Bundar.

## Results

`ValidationResult<T>` is either `{ success: true, value: T }` (the typed,
validated value — inference flows from the schema) or `{ success: false,
issues }` with each issue normalized to `{ message, path: PropertyKey[] }`.
Library-specific details are never discarded: the original issue object is
preserved on `issue.raw` as the explicit escape hatch for renderers that want
vendor codes or metadata.

Malformed dialect behavior (a schema without a valid `~standard` object, or
a `validate` returning a nonconforming result) fails closed with
`SchemaDialectError` rather than guessing.

## Consumer proof

`tests/consumer/schema/` validates the same app-shaped fixture against two
independent real validators — Zod 4 and Valibot 1 — at both the type level
(`bunx tsc`) and runtime (`bun run test:consumer:schema`).
