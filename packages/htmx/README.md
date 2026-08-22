# @bundar/htmx

Bundar HTMX dialect adapters and version-neutral protocol model (GH-039).

- Purpose: version-neutral HTMX protocol model plus the pinned htmx 2 dialect (default) and the experimental htmx 4 dialect (M3: GH-039–GH-056).
- Boundaries: must not import `@bundar/core`; `@bundar/jsx` is the one allowed workspace dependency (ADR-0016), used by `view()` for rendering.
- Exports:
  - `@bundar/htmx`: version-neutral protocol constants, header types, request/response inspection helpers, and page/fragment negotiation (`view()` / `negotiateView()`, GH-048).
  - `@bundar/htmx/2`: stable htmx 2 dialect adapter pinned to `2.0.10`.
  - `@bundar/htmx/4`: experimental htmx 4 dialect adapter pinned to `4.0.0-beta6`.
- Version discipline: htmx 2 is the default dialect. htmx 4 is explicitly marked experimental until M7 GA gates pass.

## Page/fragment negotiation (GH-048)

One route serves a complete document to ordinary navigation and a fragment to
enhanced requests, decided from normalized metadata — handlers never read raw
HTMX headers:

```ts
import { view } from "@bundar/htmx";

app.get("/items", (context) =>
  view(context.request, {
    fragment: () => ItemsSection(),          // enhanced swaps (HX-Request)
    layout: (content) => ItemsPage(content), // document wrapper
  }),
);
```

Negotiation rules: normal navigation → document; standard enhanced request →
fragment; boosted navigation → document (htmx swaps the `<body>` out of a
full page); history restore → document (a restored cache entry must be
installable as a page). Every response carries
`Vary: HX-Request, HX-Boosted, HX-History-Restore-Request`; `negotiateView()`
exposes the chosen representation and those inputs for cache/history policy.
