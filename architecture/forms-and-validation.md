---
type: Architecture Specification
title: Forms, Parsing, Validation, and Error Rendering
description: HTML-form-first input handling, Standard Schema adapters, field errors, multipart limits, and progressive response behavior.
tags:
- forms
- validation
- standard-schema
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Input priority

Bundar optimizes for `application/x-www-form-urlencoded`, `multipart/form-data`, URL query parameters, and route parameters. JSON remains supported through native request APIs and optional helpers.

# API

```ts
app.post('/todos', validateForm(CreateTodo), async c => {
  const todo = await c.services.todos.create(c.input);
  return c.action({ fragment: <TodoRow todo={todo} />, redirect: '/todos' });
});
```

# Validation package

`@bundar/schema` consumes Standard Schema-compatible validators without making a validator a core dependency. The adapter produces:

- parsed typed value;
- original safe display values;
- normalized field and form errors;
- optional issue metadata for advanced rendering.

# Invalid input

An invalid submission does not call the handler. It invokes an explicit invalid renderer or a route-level default. Ordinary requests receive a full page or redirect policy; HTMX requests receive a targeted form fragment through the dialect.

# Limits

Form and upload parsing enforce configured total bytes, field count, file count, per-file bytes, and timeout. Temporary file behavior is explicit. Untrusted filenames never become filesystem paths without sanitization and application ownership.
