# @bundar/jsx

Skeleton package created by GH-001. No renderer behavior is implemented yet.

- Purpose: secure server-only JSX renderer producing escaped HTML (M2: GH-026–GH-038).
- Boundaries: must not import `@bundar/core` or `@bundar/htmx` (`engineering/repository-layout.md`).
- Runtime dependency policy: zero runtime dependencies (`decisions/0011-zero-runtime-deps.md`), enforced by `tests/skeleton.test.ts`.
- Publishing: stays `private` until the M6 packaging gates (GH-084–GH-086).

## Streaming (GH-034)

`renderToStream(tree, { signal?, chunkBytes? })` renders to a UTF-8
`ReadableStream` without buffering the document: every walker segment is
enqueued on its own pull, awaited children are natural flush points, and a
`ByteLengthQueuingStrategy` high-water mark (default 8 KiB) provides real
backpressure — production pauses while the consumer is behind. Cancellation
(reader cancel or AbortSignal) stops the walk and settles the returned
`finished` promise (`RenderCancelledError` for cancels, `StreamRenderError`
for failures). `StreamRenderError.bytesWritten` states whether bytes already
flushed committed the status line — after that point no replacement status
can be sent; errors are observable, never faked. `streamResponse(tree)`
builds the `text/html; charset=utf-8` Response carrying `finished`.

## Typed htmx attributes (GH-035)

The stable, dialect-common `hx-*` subset typechecks on every intrinsic
element with string-literal types where the grammar is enumerable (`hx-swap`
bases + modifiers, `hx-target` selector/`this`/`closest x`/`find x`/`next`/
`previous`, `hx-encoding`, `hx-boost`, `hx-validate`) and documented open
strings where it is not (`hx-trigger`, `hx-headers`, `hx-sync`). Raw
attribute names stay visible — no wrapper components — and the renderer
never rewrites them. Experimental or dialect-specific attributes are opt-in
per app compilation via declaration merging on the deliberately-empty
`HtmxExperimentalAttributes` interface; nothing global widens to `any`.
The JSX package keeps zero runtime coupling to @bundar/htmx or htmx itself.

