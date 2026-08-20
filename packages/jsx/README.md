# @bundar/jsx

Skeleton package created by GH-001. No renderer behavior is implemented yet.

- Purpose: secure server-only JSX renderer producing escaped HTML (M2: GH-026–GH-038).
- Boundaries: must not import `@bundar/core` or `@bundar/htmx` (`engineering/repository-layout.md`).
- Runtime dependency policy: zero runtime dependencies (`decisions/0011-zero-runtime-deps.md`), enforced by `tests/skeleton.test.ts`.
- Publishing: stays `private` until the M6 packaging gates (GH-084–GH-086).
