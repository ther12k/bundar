# Browser support matrix

Updated: 2026-08-25 · Machine-readable source:
[artifacts/conformance/browsers.json](../../artifacts/conformance/browsers.json)
(BR-074)

## Claim (beta)

| Engine | Status | Evidence |
| --- | --- | --- |
| Chromium (Playwright `chrome`) | ✅ Supported — full conformance evidence | `tests/browser/run.ts htmx2` / `htmx4` lanes: navigation, forms, validation, redirects/history, OOB multi-region, errors, CSRF/session, assets/CSP |
| Firefox | ⛔ Out of scope | Explicit maintainer decision — well-known-browser policy keeps the tested surface to Chromium only |
| WebKit | ⛔ Out of scope | Same decision |

## Policy notes

- The claim is deliberately **narrow and explicit**: Bundar's stable htmx 2
  workflows are verified on Chromium; no cross-engine guarantee is made.
- Multi-engine lanes may be revisited before any GA announcement
  (`reviewTrigger` in the JSON artifact). Until then, absence of Firefox/
  WebKit results is the DOCUMENTED state, not a silent gap.
- No automatic retries: consistent failures stay failures. Quarantined
  steps require an owner + review date recorded here.
- Playwright artifacts (screenshots/traces) are retained on failure only
  and contain no secrets (fixture data exclusively).

## Consuming results

`bun run test:browser:htmx2` / `test:browser:htmx4` execute the canonical
lanes; per-step stdout/stderr/command transcripts land under
`output/playwright/<lane>/`. The release gate consumes the machine-readable
per-engine summary from `artifacts/conformance/browsers.json`.
