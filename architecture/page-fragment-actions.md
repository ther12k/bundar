---
type: Architecture Specification
title: Page, Fragment, and Action Response Model
description: First-class representation negotiation and mutation responses for ordinary browsers and htmx clients.
tags:
- page
- fragment
- action
- progressive-enhancement
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
sources:
- id: htmx-2-docs
  resource: https://htmx.org/docs/
  title: htmx 2 documentation
  author: team:htmx
  last_modified: '2026-08-21'
- id: htmx-4-docs
  resource: https://four.htmx.org/docs
  title: htmx 4 beta documentation
  author: team:htmx
  last_modified: '2026-08-21'
---

# View response

```tsx
return c.view({
  title: 'Todos',
  page: <TodoPage todos={todos} />,
  fragment: <TodoList todos={todos} />,
});
```

The selected dialect normalizes whether the request asks for a page or partial representation. Bundar adds the dialect’s `Vary` headers when variants differ.

# Action response

```tsx
return c.action({
  fragment: <TodoRow todo={todo} />,
  redirect: routes.todos.index(),
  updates: [replace('#todo-count', <TodoCount count={count} />)],
  events: { toast: { kind: 'success', message: 'Created' } },
});
```

- Ordinary form request: use a `303` redirect by default.
- htmx request: return rendered content plus adapter-owned response directives.
- Validation failure: render a form/error fragment using dialect-correct error-swap behavior while preserving the framework’s normalized semantic status.

# No double source of truth

The route handler describes one action outcome. It does not manually branch on raw `HX-Request`, duplicate redirect logic, or construct version-specific headers.

# Override

Advanced routes may return raw responses. Once they do, representation selection, cache variation, and cross-dialect behavior become the application’s responsibility.
