# Accessibility guide

Bundar applications are server-rendered HTML first, so the accessibility
baseline is a property of the markup your handlers render — not of client
JavaScript. The browser lanes enforce it: `bun run test:a11y` (axe-core
scan, zero critical/serious violations, no waivers) and `bun run
test:no-js` (keyboard-only PRG flows) run against the unmodified
reference applications on every release battery.

## The tested baseline

Canonical pages of the reference applications are scanned with axe-core
(WCAG 2.0/2.1 A/AA tags). The gate is **zero critical/serious
violations**; lower-severity findings are reported in the lane artifacts
(`output/playwright/accessibility/*-scan.json`) but do not block. Any
waiver would have to be recorded with rationale in
`artifacts/conformance/browsers.json` — none exist today.

Beyond the automated scan, the lanes assert what automation cannot:

- **Landmarks and headings** — one `<h1>`, `header`/`main` present, flash
  region `aria-live="polite"`.
- **Table semantics** — every `<th>` carries `scope="col"`.
- **Names** — every visible form control is labeled (`label for`,
  `aria-label`, or `aria-labelledby`).
- **Error association** — invalid fields carry `aria-describedby`
  pointing at their error region and `aria-invalid="true"` when invalid.
- **Keyboard reachability** — Tab order reaches every control (filters,
  title input, Add, per-item Done/Delete) with no traps; mutations are
  submitted with Enter on the focused control.

## Validation errors

The invalid-submission model (`renderForm` receives the redacted
retained values, field-error model, and a first-error focus hint) is
declared in `@bundar/forms`; how it reaches the browser differs by mode:

- **Enhanced (htmx) requests** receive a re-rendered form fragment
  targeted at the server-known form region (`formTarget`), with the error
  text associated to the field (`aria-describedby`, `aria-invalid`). The
  lane proves the swapped fragment passes the full axe scan.
- **Ordinary (no-JS) submissions** currently receive the framework
  default 422 document, which announces the errors through a
  `role="alert"` summary. Re-rendering the application document with the
  associated form is a planned improvement (BR-088, #140).
- **htmx 2 (BR-087, closed)**: htmx 2.x does not swap 4xx response bodies
  by default, so `HtmxScript` ships the dialect-owned preset
  automatically — a CSP-safe `<meta name="htmx-config">` (static tag, no
  inline script) rendered in `<head>` before the asset script. Reference
  applications, the starter template, and the scaffolder all place
  `HtmxScript(...)` in the document's `head` slot; enhanced invalid
  submissions swap the re-rendered form region by default (proven by the
  accessibility lane with zero runtime configuration). Pass
  `errorSwap: false` to `HtmxScript` only when your application
  configures htmx itself. The htmx 4 beta needs no preset: its error
  swaps are governed by server-issued response directives.

## Focus management responsibilities

Bundar owns the server side; the application owns what the user's focus
does. The responsibilities, as enforced/documented by the lanes:

| Situation | Responsibility | Behavior |
| --- | --- | --- |
| Full navigation (no-JS PRG, ordinary links) | Browser + app markup | Focus resets to the document start; the flash region is `aria-live` so outcomes are announced. Provide skip-free, landmarked documents. |
| Validation error (no-JS) | Framework document | `role="alert"` summary announces without focus theft. |
| Validation error (enhanced) | App fragment + browser | The swapped fragment replaces the form region (`outerHTML` pairing is server-issued); place focus on the first errored field inside the fragment when you need it — htmx does not move focus for swaps. |
| htmx history restoration | Dialect adapter | Boosted/restored navigations receive installable documents, never bare fragments, so landmarks survive. |
| Dialog-ish flows | Out of scope | Bundar has no dialog primitive; use dedicated pages/fragments with conventional focus patterns. |

## What the framework guarantees

- Escaped-by-default rendering: untrusted text and attributes cannot
  inject markup (`raw()` is the auditable boundary).
- Documents from `document()` carry `lang`, title, and viewport meta —
  the minimum for meaningful announcement and zoom.
- The dual-dialect conformance suites pin representation negotiation and
  cache separation so assistive-technology-visible content is never
  served stale across modes.

## Out of scope

This is a baseline, not a WCAG certification: application-specific
design systems, contrast themes, and screen-reader user studies remain
the application's responsibility (see `docs/guides/security.md` for the
same posture on security claims).
