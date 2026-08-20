# GH-008 Verification Transcript

## Environment

- Bun `1.4.0`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Browser: Chrome for Testing `152.0.7977.8`
- Playwright Chromium build `1237`
- Stable lane: htmx `2.0.10`
- Experimental lane: htmx `4.0.0-beta6` (not htmx 4 GA)
- Fixture server: Bun ephemeral localhost port, shared application source

## Pinned assets

- `fixtures/htmx2/htmx.min.js`
  - Source: `https://unpkg.com/htmx.org@2.0.10/dist/htmx.min.js`
  - Bytes: `51238`
  - SHA-256: `71ea67185bfa8c98c39d31717c6fce5d852370fcdfd129db4543774d3145c0de`
- `fixtures/htmx4/htmx.min.js`
  - Source: `https://unpkg.com/htmx.org@4.0.0-beta6/dist/htmx.min.js`
  - Bytes: `36282`
  - SHA-256: `28fae7bbe8e8142b702debb9d5234a9a436d9435a4b5165b195aa1a7ed840d25`

The exact vendor bytes are excluded from Prettier rewriting through `.prettierignore`.

## Commands

```text
$ bun run test:browser:htmx2
browser:htmx2: smoke and interaction scenarios passed; negative fixture failed as expected
  -> exit 0

$ bun run test:browser:htmx4
browser:htmx4: smoke and interaction scenarios passed; negative fixture failed as expected
  -> exit 0

$ bun run test:browser:report
browser:report: 2 lanes recorded in evidence/gh-008/report.json
  -> exit 0
```

## Scenario and artifact results

Both lanes execute the same source fixture and cover:

- smoke page load;
- fragment GET and DOM swap;
- form POST and DOM swap;
- history push and URL restoration;
- deliberately incorrect response-header fixture.

Each lane records command output, DOM HTML, state JSON, screenshot, request log,
console output, and Playwright trace/network resources under
`output/playwright/<lane>/`. The curated combined report is
`evidence/gh-008/report.json`.

Observed request sequence in both lanes:

```text
GET /
GET /assets/htmx.min.js
GET /fragment
POST /echo
GET /history-target
```

Both console reports contain zero messages, errors, or warnings after the fixture
server's `/favicon.ico` 204 route was added.

The negative command exits `1` in both lanes with the intended assertion:

```text
Error: deliberately incorrect header fixture rejected: expected HX-Trigger-After-Swap
```

The server intentionally returns `HX-Trigger`, not `HX-Trigger-After-Swap`; a
missing expected header therefore fails the fixture instead of being downgraded
to a warning or pass.

## Stable and experimental outcomes

- htmx2 stable lane: lifecycle state is `event: afterRequest`; the stable assertion passes.
- htmx4 beta lane: lifecycle state is `event: none`; this is recorded as an experimental observation and is not treated as htmx 4 GA compatibility evidence.

The htmx4 result is reported separately from stable-lane outcomes, consistent
with the compatibility matrix and browser-conformance standard.

## Remaining risks and deviations

- htmx4 is beta-only evidence; no GA compatibility claim is made.
- Lifecycle event mapping remains a future dialect-adapter concern.
- This harness currently exercises DOM swaps, forms, history, headers, console,
and requests; streaming/partial transport behavior remains future implementation
work.
- The fixture is a browser harness for protocol evidence, not a Bundar runtime
implementation claim; Bundar route/renderer behavior remains deferred to M1/M2.
