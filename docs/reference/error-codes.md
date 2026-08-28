# Error codes reference

Machine-readable error identities are a **compatibility surface**:
codes and their status mappings are frozen within a release line; messages
may change; additions are minor releases; removals require a major.

## Registry

| Code | Status | Meaning |
| --- | --- | --- |
| `bad_request` | 400 | Malformed request syntax |
| `unauthorized` | 401 | Missing/invalid credentials |
| `forbidden` | 403 | Authenticated but not permitted |
| `not_found` | 404 | No route matched |
| `method_not_allowed` | 405 | Method not registered for path |
| `conflict` | 409 | State conflict (e.g. optimistic version) |
| `unprocessable` | 422 | Validation failure |
| `payload_too_large` | 413 | Body budget exceeded |
| `unsupported_media_type` | 415 | Content-Type not accepted |
| `too_many_requests` | 429 | Rate budget exceeded |
| `request_timeout` | 408 | Deadline before completion |
| `internal` | 500 | Unexpected framework/application fault |
| `service_unavailable` | 503 | Dependency or capacity unavailable |
| `server_shutting_down` | 503 | Drain deadline expired / forced stop |
| `lifecycle_start_failed` | 503 | Startup resource failed; rollback done |
| `session_unavailable` | 503 | Session store could not persist |

## Framework class inventory

| Class | Package | Public code |
| --- | --- | --- |
| `HttpError(code)` | core | the passed code |
| `ClientDisconnectError` / abort-like | core | *(no response — transport gone)* |
| `LifecycleStartError` | core | `lifecycle_start_failed` |
| `SessionStoreError` | security | `session_unavailable` |
| `DirectiveValidationError` | htmx | `internal` (developer bug; dev message shows detail) |
| `UpdateIntentError` | htmx | `internal` |
| `BodyConsumedError` | core | `internal` |
| Cancellation reasons | core internal | `request_timeout` / `server_shutting_down`; disconnect → no response |

## Redaction policy

Applied at the single error boundary:

- Sensitive keys (`cookie`, `set-cookie`, `authorization`, csrf variants,
  `password`, `secret`, `token`, session ids) → `[redacted]`
- Filesystem-path-like strings → `[path]`
- Stack traces: development only
- Correlation: every boundary response carries `x-bundar-error-id`
  matching the log entry; headers never alter cache semantics
- Cancellation is NOT transaction rollback

## Change policy

Snapshot test `packages/core/test/errors/codes.test.ts` locks this table.
Any diff fails CI; update the snapshot ONLY in the same commit as a
release-notes entry describing the change.
