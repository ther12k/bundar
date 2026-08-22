# GH-021 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-021-response-helpers`

## Delivered contract

`packages/core/src/response.ts` — every helper returns a native `Response`;
no implicit conversion of arbitrary handler returns exists anywhere:

- `text` / `json` / `html` (strings only; JSX Response integration is GH-033)
  with status + custom headers.
- `redirect` (default 302; documented 301/302/303/307/308 semantics — 301/308
  preserve method, 303 forces GET) and `seeOther` (303 post-action).
- `empty` (204 default, 304/200 explicit) and `file` (Bun.file streaming
  delegation with explicit content type).
- `withHeaders`: safe header composition — **Set-Cookie and Vary append**
  (multi-value preserved via `getSetCookie()`), other keys overwrite, arrays
  join with `, ` for non-multi keys; never mutates the original response.

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun run --filter @bundar/core typecheck
  -> exit 0

$ bun test ./packages/core/test/responses
  12 pass, 0 fail (helper suite) + type-test file enforced by tsc

$ bun run test:types
  9 pass, 0 fail (includes GH-012 type model)
  -> exit 0

$ bun test
  304 pass, 0 fail, 2736 expect calls across 38 files
  -> exit 0

$ bun run typecheck / lint / architecture:check (42 files) / pack:inspect @bundar/core / build / format:check
  -> exit 0
```

The type-contract file (`test/responses/contract.test-d.ts`, enforced by
`tsc --noEmit`) proves strings/objects as handler returns are compile errors
and `Response | Promise<Response>` remains the only contract.

## Acceptance evidence

- Every helper has status/header/body tests (12 assertions groups).
- Redirect defaults: 302 default + all five documented statuses + 303
  post-action helper.
- Set-Cookie: two cookies survive as two headers; Vary: appends without
  collapsing; original response untouched.
- Type tests reject unsupported convenience returns (`@ts-expect-error`
  anchors on string and object returns).
- Boundary repair: an initial test used a raw `HX-Request` header example,
  which the architecture check correctly rejected — replaced with `Accept`
  (raw HTMX strings stay confined to `@bundar/htmx`).
- No mandatory test failure hidden, skipped, or downgraded.

## Residual risks

- JSX body integration (`page`/`fragment` over @bundar/jsx) is GH-033.
- HTMX response headers layer on `withHeaders` in GH-045+.
