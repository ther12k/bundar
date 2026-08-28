# Sink inventory

Machine-checked companion: `bun run security:sinks` (`tools/security/sink-audit.ts`). The audit fails closed on (A) `HX-*` response-header writes outside
the dialect adapter and (B) production `raw()` call sites missing from the
registered allowlist. Application code under `examples/`/`templates/` is
reported, not gated.

| # | Sink | Owner | Input type | Encoding / validation | Tests | Residual risk |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | HTML text children | `@bundar/jsx` (`escape.ts`, `render/node.ts`) | any child value | `renderPrimitive()` entity-encodes; objects rejected except branded raw | `text-rendering.test.ts`, `security/raw-html*.test.ts`, `tools/security/jsx-corpus.ts` | none known |
| 2 | Attributes (incl. boolean/enum) | `@bundar/jsx` (`render/attributes.ts`) | string/number/bool | attribute-value escaping; URL schemes validated per attribute class | `security/attribute-injection.test.ts` | exotic attribute names rejected by name validation |
| 3 | `class` serialization | `@bundar/jsx` (`render/attributes.ts`) | ClassValue model | flattened then escaped as normal attribute | attribute tests | none known |
| 4 | `style` serialization | `@bundar/jsx` (`render/attributes.ts`) | StyleValue model | serialized to declaration text, then escaped as attribute value | attribute tests | CSS property injection within one declaration is application input responsibility |
| 5 | RCDATA + raw-text elements (`script`,`style`,`textarea`,`title`) | `@bundar/jsx` (`render/elements.ts`) | string | `serializeRawText()`: `</` neutralized per language; entities for RCDATA | `jsx-corpus.ts`, conformance lanes | content is trusted-shape text; closing-sequence injection neutralized |
| 6 | Comments | `@bundar/jsx` renderer | string | rendered as `<!-- … -->`; `--` sequences are application responsibility | corpus coverage | nested-comment tricks out of scope (no conditional-comment era targets) |
| 7 | Raw values | `@bundar/jsx` `raw()` (`raw.ts`) | caller-sanitized HTML | opaque module-private brand + own-property check; unbranded shapes throw | `security/raw-html-forgery.test.ts` | caller owns sanitization by contract — no bundled sanitizer |
| 8 | OOB / multi-region serialization | `@bundar/htmx` (`updates.ts`) | framework-rendered fragment strings | single registered raw site; fragments originate from the JSX renderer | browser dual-dialect lanes, htmx tests | applications must not feed untrusted markup into update intents |
| 9 | Event JSON (`HX-Trigger*`) | `@bundar/htmx` (`directives.ts`) | event names + payloads | `validateEventName`/injection checks + JSON encoding before header write | htmx directive tests | payload JSON is encoded, never spliced |
| 10 | Redirect URLs (`HX-Redirect`, `HX-Location`, `Location`) | `@bundar/core` (`response.ts`), `@bundar/htmx` (`directives.ts`) | application-provided URLs | structural validation (`validateUrl`, no-injection scan); CRLF guarded by header layer | `security/redirects-audit.ts`, directive tests | open-redirect policy is application concern |
| 11 | Header helpers | `@bundar/core` (`withHeaders`, cookie mutations) | literal names/values | Fetch `Headers` semantics; cookie serialization validates name/value | `security/headers-audit.ts`, `cookies-audit.ts` | values pass through fetch-layer validation only |
| 12 | Response cloning / static entries | `@bundar/core` (`routing/compiler.ts`) | prebuilt `Response` | passed to Bun by reference; metadata-carrying statics fail closed | routing tests, `cache-audit.ts` | immutable-response assumption relies on Bun dispatch |
| 13 | Cache negotiation (`Vary`) | `@bundar/htmx` (`cache-policy.ts`) | dialect profile | fail-safe defaults, adapter-owned header names only | `security/cache-audit.ts`, browser lanes | new dialect headers must land inside the adapter |

## Rules enforced by the audit

- **Rule A** — a `HX-*` literal in a response-header write position outside
  `packages/htmx/src/**` fails the build.
- **Rule B** — a production `raw(`/`unsafeHtml(` call outside the
  registered allowlist (currently `packages/htmx/src/updates.ts`) fails the
  build. Registering a new site requires updating this inventory in the same
  change.

Related gates: `bun run security:raw-html-audit`, `bun run architecture:check`.
