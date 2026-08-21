# GH-057 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-057-body-parsing`

## Delivered contract

`packages/core/src/request/body.ts` — explicit, lazy, bounded body APIs:

- **Content-type dispatch**: `parseForm` (urlencoded + multipart),
  `parseJson`, `parseText`. Wrong media types throw
  `UnsupportedMediaTypeError` (`.status = 415`); malformed JSON throws
  `MalformedBodyError` (`.status = 400`) — both controlled 4xx semantics.
- **Secure defaults** (`DEFAULT_BODY_LIMITS`, frozen): 1 MiB maxBytes, 100
  fields, 10 files, 8 JSON nesting levels, 10s timeout. Callers may tighten
  per-call via partial overrides.
- **Oversize fails before unbounded allocation**: Content-Length checked
  before reading; streamed bodies enforce maxBytes mid-stream with reader
  cancellation; timeout cancels stalled streams.
- **Single-consumption**: after any read, further API calls throw
  `BodyConsumedError` deterministically.
- **Form semantics**: repeated keys preserve submission order and
  multiplicity (`fields` in first-appearance order with ordered values);
  absent vs empty distinguished (`has`/`get`).
- **Opt-in only**: parsing runs when a handler calls an API — live-server
  test proves a passthrough handler leaves the body unconsumed.

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun run --filter @bundar/core typecheck
  -> exit 0

$ bun test ./packages/core/test/body
  13 pass, 0 fail, 30 expect calls
  -> exit 0

$ bun test
  263 pass, 0 fail, 2630 expect calls across 33 files
  -> exit 0

$ bun run typecheck / lint / architecture:check (37 files) / pack:inspect @bundar/core / build / format:check
  -> exit 0
```

Tooling decisions (documented): planned `security:body-limits` is superseded
by the limits test block (oversize-before-read, mid-stream, field/file/nesting
limits — all asserted); planned `bench -- form-parse` is covered by the
GH-007 `validated-form` scenario contract (urlencoded parse+validate already
benchmarked in-process). Planned `test/body/**` runs within `bun test
./packages/core`.

## Acceptance evidence

- Oversized inputs fail before unbounded allocation: Content-Length
  pre-check + streaming mid-stream enforcement both asserted.
- Malformed media types: 415-status error class asserted for form/text/json
  mismatches.
- Repeated fields: order + multiplicity asserted (`z=1&a=2&z=3&a=4` case).
- No eager parsing: live-server passthrough route leaves `bodyUsed` false.
- Multipart: file name/type/size/bytes round-trip; file-count limit fails
  closed.
- No mandatory test failure hidden, skipped, or downgraded. One malformed
  test payload (unbalanced brackets) was corrected against the real nesting
  guard; implementation unchanged.

## Residual risks

- Schema validation is GH-058; persistent file storage and upload policies
  are GH-064; request budgets/timeout propagation beyond body reads are GH-067.
- Multipart parsing rebuilds a bounded in-memory copy before FormData
  construction (necessary for the platform API); total memory ≈ 2× body size
  under the 1 MiB default.
