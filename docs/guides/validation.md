# Validation and field rendering

Bundar validates through Standard Schema v1 — any conforming validator
works, none ships. This page covers what invalid submissions hand to your
renderers, and the field helper that keeps multi-value input honest.

## The invalid render object

`invalid.fragment` and `invalid.document` receive an `InvalidFormView` —
the workflow's render data (ordered field errors, retained safe values,
focus hint) plus a per-field accessor:

```ts
const title = field("title");

title.value;    // first submitted scalar value, or undefined
title.values;   // every submitted value, in submission order
title.multiple; // true only when more than one value was submitted
title.error;    // this field's first message, or undefined
title.errors;   // this field's messages, in issue order
title.invalid;  // true when the field has at least one message
```

## Multi-value behavior

| Submission | `value` | `values` | `multiple` |
| --- | --- | --- | --- |
| (missing) | `undefined` | `[]` | `false` |
| `title=one` | `"one"` | `["one"]` | `false` |
| `title=one&title=two` | `"one"` | `["one", "two"]` | `true` |

Guarantees, plainly:

- `value` is the first submitted scalar value — never a joined string.
- `values` preserves submission order, duplicates included.
- duplicate values are never silently comma-joined.
- `error` is the first error for that field only.
- `errors` contains only that field's errors, in original issue order.
- global (form-level) errors never leak into a field view.
- sensitive retained values follow Bundar's redaction policy — sensitive
  keys are absent before your renderer ever sees them.

## The anti-pattern

```ts
// WRONG: arrays become "one,two" — malformed and duplicate submissions
// silently disappear into comma-joined text
String(render.submitted["title"])
```

Use the accessor instead:

```ts
field("title").value ?? ""
```

Retained values are already safe (redacted); re-render them verbatim so
the user sees exactly what they submitted.
