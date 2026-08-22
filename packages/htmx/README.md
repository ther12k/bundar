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

## Cache variation and history safety (GH-049)

`cachePolicyFor(negotiated, options)` builds the fail-safe policy:
`Vary` names every negotiation input (GH-048's headers) and Cache-Control
defaults to `no-store`. Shared caching (`sMaxage`) and client caching
(`maxAge`) are explicit opt-ins; private/authenticated content can never
combine with `public`, and `max-age` may never exceed `s-maxage`. Both
violations throw `CachePolicyError`. `applyCachePolicy(response, policy)`
merges Vary losslessly and sets Cache-Control only when the handler did
not. `historyPolicyFor(adapter)` surfaces the pinned per-dialect history
facts (restore header, push-url default, the htmx 4 beta's provisional
cache-rework note) so restore behavior is data, never guesses. A simulated
proxy cache (`tests/proxy-cache/`) proves variants stay distinct and
reproduces the missing-Vary poisoning risk as documentation.

## Progressive actions (GH-050)

`action({ fragment, redirectTo, directives?, status? })` defines one
mutation result; `actionResponse(request, result)` composes it: enhanced
submissions receive the rendered fragment with directives applied, the
negotiation Vary, and the fail-safe cache policy; ordinary submissions
receive the Post/Redirect/Get fallback (303 default; 301/302/307/308
approved). Validation happens in `action()` BEFORE any response commits —
a missing fallback redirect throws unless the route passes
`noFallbackRedirect: true`, and conflicting fields are diagnosed. String
fragments escape as text; use a JSX tree or the explicit `raw()` boundary
for markup. Business/transaction logic stays in the handler — the composer
owns only the response.

## Error negotiation (GH-065)

`errorViewResponse(request, view, policy)` renders error states per
request: ordinary navigations get the full error document (through jsx's
`page()`, doctype enforced); enhanced requests get the local fragment
(form region / modal region / empty body) with server-known retarget hints
only — client `HX-Target` is display context, never authorization. 401/403
failures render the document path unless the app EXPLICITLY opts in via
`renderAuthFragment`, so protected fragment content cannot leak to
enhanced requests. The htmx 2 vs 4 error-swap difference is pinned adapter
data (`errorSwapMode`): under v4's no-swap default the composer adds an
explicit reswap so fragments actually reach their region. All error
responses are `private, no-store` with the negotiation Vary; messages
render escaped. `validationErrorView(fieldErrors)` + the standard
`renderValidationErrorFragment` wire GH-059 models straight in.

## Validated form actions (GH-060)

`runFormAction(context, definition)` composes the whole pipeline: bounded
parsing (GH-057) → Standard Schema validation (GH-058) → invalid-form
rendering with the GH-059 field-error model and REDACTED retained values →
the GH-050 action response, or the GH-065 error negotiation. Identical
business validation runs for normal browsers and enhanced flows — invalid
submissions are 422 in both worlds (fragment re-render for enhanced, full
document for ordinary), and no JSON client code is ever required. The
success fragment builder runs EXACTLY ONCE per request inside optional
transaction hooks (begin/commit/rollback); a business failure rolls back.
`InvalidFormRender` carries the field-error model, safe submitted values
(secrets redacted by policy), and a first-error focus hint.

## Out-of-band & partial update intents (GH-051)

`serializeUpdates(intents, adapter)` serializes multi-region update intents
(`replace-content`, `replace-element`, `append`, `prepend`, `remove`) into
dialect-appropriate markup (`hx-swap-oob`). Applications describe the
update once by target element ID and operation; the adapter chooses the
mechanism and returns diagnostics for compatibility auditing
(`auditUpdateMechanisms`). Destructive versus additive meaning is explicit
and never silently altered. Unsupported dialect modes fail closed with
`UpdateIntentError`.

## Lifecycle & application events (GH-046)

Bundar normalizes HTMX client lifecycle events (`before-request`,
`after-request`, `before-swap`, `after-swap`, `after-settle`, `response-error`,
`send-error`, `history-restore`, `oob-before-swap`, `oob-after-swap`, `timeout`)
via `resolveDialectEvent(event, dialect)`. The mapping table identifies exact,
approximate, and unsupported mappings across dialect versions
(`getEventMappingTable`). Server-triggered application events
(`createApplicationEvent`) ensure JSON-safe, injection-tested event names and
payloads. An explicit `rawDialectEvent(name)` escape hatch allows opting into
unmapped version-specific events with audit tracking.

## Inheritance & extension compatibility (GH-047)

Bundar models attribute inheritance explicitly rather than relying on implicit
upstream defaults. `formatDisinherit(attributes)` formats `hx-disinherit` values
(or `"*"`), and `diagnoseInheritance(attribute, dialect)` identifies whether an
attribute inherits by default under htmx 2 vs htmx 4.

Extension helpers provide structured descriptors (`HtmxExtensionDescriptor`,
`OFFICIAL_EXTENSIONS`), format `hx-ext` attributes (`formatExtensionAttribute`),
and diagnose migration notes/compatibility (`diagnoseExtension`). The official
`HTMX_2_COMPAT_EXTENSION` descriptor provides a migration reference for
htmx 4 beta testing, while `rawExtension(name)` provides an audited escape hatch.

## Navigation & redirect helpers (GH-052)

`composeNavigation(request, url, options)`, `htmxRedirect(request, url, options)`,
and `htmxLocation(request, config, options)` provide safe, adaptive navigation
responses:
- Normal requests receive standards-compliant `303 Location` redirects (configurable).
- Enhanced HTMX requests receive `HX-Redirect` or `HX-Location` headers with `200 OK`.
- `validateRedirectUrl(url, options)` enforces open-redirect defense: protocol-relative
  URLs (`//evil.com`), JavaScript/data URI schemes, and unlisted external origins are
  denied by default and fail closed with `InvalidRedirectUrlError`.
- `htmxRefresh()` emits `HX-Refresh: true` for full client reload.

