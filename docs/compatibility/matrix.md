# HTMX Compatibility Matrix

Bundar pins htmx dialect profiles to exact versions with recorded SHA-256
hashes. Compatibility is defined by tested profiles, not floating majors.

| Feature | htmx 2.0.10 (stable/default) | htmx 4.0.0-beta6 (experimental) |
|---------|-----|-----|
| **Maturity** | Stable, production-ready | Experimental [provisional] |
| **Asset SHA-256** | `71ea6718…5c0de` | `28fae7bb…40d25` [provisional] |
| **Local serving** | Offline via `createHtmxAssetHandler` | Offline via `createHtmxAssetHandler` |
| **Request normalization** | Full (`HX-Request`, `HX-Trigger`, etc.) | Full + `HX-Source` alias |
| **Response directives** | Full (`HX-Location`, `HX-Redirect`, etc.) | Full |
| **Page/fragment negotiation** | ✅ Native | ✅ Native |
| **Progressive actions** | ✅ Native (303 + fragment) | ✅ Native |
| **Error negotiation** | ✅ Default target-swap | ✅ Explicit `reswap` compensation |
| **OOB updates** | ✅ `hx-swap-oob` | ✅ `hx-swap-oob` |
| **History** | Push by default, `HX-History-Restore-Request` | Push default true [provisional], history cache rework |
| **Cache variation** | ✅ Full Vary + policy | ✅ Full Vary + policy |
| **Redirects** | ✅ Open-redirect protected | ✅ Open-redirect protected |
| **CSRF / Sessions** | ✅ Full | ✅ Full |
| **SSE extension** | Native | Emulated |
| **WebSocket extension** | Native | Emulated |
| **json-enc extension** | Native | Unsupported |
| **response-targets** | Native | Unsupported |
| **morphdom** | Native | Emulated |
| **Inheritance** | Implicit by default | Explicit by default [provisional] |
| **cache-control directive** | Native | Unsupported |
| **Browser conformance** | 19 scenarios verified | 19 scenarios verified [provisional] |
| **Dual-dialect parity** | ✅ Identical behavior from same source | ✅ Identical behavior from same source |

> **Important:** htmx 4 capabilities marked [provisional] are beta/experimental.
> GA revalidation is mandatory in milestone M7 before any GA compatibility
> claim may be made. See [htmx4-beta6.md](htmx4-beta6.md) for details.
