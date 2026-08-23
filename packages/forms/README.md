# @bundar/forms

Progressive-form workflow for Bundar: bounded parsing orchestration, safe
retained values, field-error presentation models, and ordinary/enhanced
action composition from one validated mutation.

**Status: skeleton (BR-013).** The contract surface is frozen by
[ADR-0018](../../decisions/0018-post-alpha-package-boundaries.md);
implementation moves out of `@bundar/htmx` in BR-014/BR-015. Placeholder
factories throw until then.

## Boundary

- Depends on `@bundar/core` (parser primitives) and `@bundar/schema`
  (validation integration) — nothing else.
- Never imports `@bundar/htmx`: enhanced responses are composed through an
  injected composer.
- Ships no validator; any Standard Schema validator works.

Applications that use raw request handling may omit this package entirely.
