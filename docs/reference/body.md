# Body consumption reference

One request body, one owner. All helpers coordinate through a per-request
ownership tag so conflicts are actionable instead of engine-specific.

## Rules

| Situation | Result |
| --- | --- |
| Same helper twice (`parseForm` → `parseForm`) | `BodyConsumedError` naming nothing new — body is single-consumption. |
| Different helpers (`parseJson` → `parseForm`) | `BodyConsumedError`: "already consumed by parseJson … use parseFormCached". |
| `parseFormCached` | Lazy cache: first call parses + owns; later calls return the SAME parsed instance. |
| `request.clone()` | Tees lazily; does NOT consume or reset the original. |
| Abort mid-body | Truncated payloads are discarded — never parsed as complete forms. |

## Content-type conformance

| Input | Status / error |
| --- | --- |
| Missing/other content-type for JSON/form parsers | `415` `UnsupportedMediaTypeError` (header echoed for diagnostics) |
| JSON with non-UTF8 charset | `415` (RFC 8259: JSON is UTF-8) |
| Malformed JSON / truncated multipart | `400` `MalformedBodyError` |
| Limit breaches | `413` maxBytes/maxFileBytes · `408` timeout/abort · `400` other kinds via `bodyLimitToHttpError` |
| Empty urlencoded body | Parses to an empty form |
| Empty JSON body | `400` malformed |

## Redaction

Parser errors never echo body values: messages contain limits,
kinds, and consumer names only.
