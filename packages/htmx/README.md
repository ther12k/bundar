# @bundar/htmx

Bundar HTMX dialect adapters and version-neutral protocol model (GH-039).

- Purpose: version-neutral HTMX protocol model plus the pinned htmx 2 dialect (default) and the experimental htmx 4 dialect (M3: GH-039–GH-056).
- Boundaries: must not import `@bundar/core` or `@bundar/jsx`.
- Exports:
  - `@bundar/htmx`: version-neutral protocol constants, header types, and request/response inspection helpers.
  - `@bundar/htmx/2`: stable htmx 2 dialect adapter pinned to `2.0.10`.
  - `@bundar/htmx/4`: experimental htmx 4 dialect adapter pinned to `4.0.0-beta6`.
- Version discipline: htmx 2 is the default dialect. htmx 4 is explicitly marked experimental until M7 GA gates pass.
