# HTMX 4 Beta6 Compatibility Profile

Bundar's experimental dialect is pinned to **htmx 4.0.0-beta6** (GH-044, GH-054).

> **Provisional status notice:** All HTMX 4 capabilities and compatibility facts are **provisional**. GA revalidation is mandatory in milestone M7 (GH-089–GH-094) before any production or GA compatibility claim may be made.

## Pinned profile facts

- **Tested version**: `4.0.0-beta6` [provisional]
- **Asset SHA-256**: `28fae7bbe8e8142b702debb9d5234a9a436d9435a4b5165b195aa1a7ed840d25`
- **Maturity**: Experimental (Provisional)
- **Local serving**: Offline by default via `createHtmxAssetHandler({ dialect: htmx4Experimental })` and `<HtmxScript dialect={htmx4Experimental} />`.

## Verified browser capabilities

The experimental browser conformance suite (`artifacts/conformance/htmx4-beta6.json`) verifies 19 distinct browser scenarios under Chrome for Testing:

1. **Request normalization with aliases** (`GH-041`, `GH-044`): `HX-Source` mapped to normalized `sourceElement` alongside canonical `HX-Request`, `HX-Boosted`, `HX-Target`, `HX-Current-URL`, `HX-Prompt`.
2. **Response directives** (`GH-042`, `GH-044`): `HX-Location`, `HX-Push-URL`, `HX-Redirect`, `HX-Refresh`, `HX-Replace-URL`, `HX-Reselect`, `HX-Reswap`, `HX-Retarget`, `HX-Trigger`.
3. **Full-page & fragment negotiation** (`GH-048`): single route serves complete document to normal browsers and fragments to HTMX 4, with `Vary: HX-Request, HX-Boosted, HX-History-Restore-Request`.
4. **Boosted navigation** (`GH-048`): full document body swap.
5. **Action composer & PRG fallback** (`GH-050`): 303 Location redirect for normal forms, HTML + trigger directives for enhanced requests.
6. **Error negotiation with swap compensation** (`GH-065`): 422 form region update with explicit `reswap` (compensating for v4's no-swap default); 401/403 document path.
7. **CSRF protection** (`GH-061`): synchronizer tokens in hidden field and `x-csrf-token` header; token rotation.
8. **Session lifecycle** (`GH-062`): login-rotate, whoami, logout, and cookie invalidation.
9. **Out-of-band updates** (`GH-051`): multi-region DOM updates via `hx-swap-oob`.
10. **History restore** (`GH-049`): browser back/forward navigation restores document.
11. **Open-redirect defense** (`GH-052`): protocol-relative URLs (`//evil.com`) and dangerous schemes rejected.
12. **Asset serving** (`GH-045`): local asset handler with ETag matching SHA-256, 304 Not Modified, and immutable cache.

## Known differences and provisional findings

- **Header names**: v4 renames request trigger header to `HX-Source`; Bundar's normalized metadata abstracts this behind `sourceElement` via `headerAliases`.
- **Default error swap**: v4 changes default error behavior to no-swap; `errorViewResponse()` automatically compensates by emitting an explicit `HX-Reswap: innerHTML` when serving error fragments to v4.
- **Inheritance rework**: v4 reworks inheritance to be explicit-by-default; `diagnoseInheritance()` flags implicit assumptions.
- **Cache control**: `cache-control` response directive is unsupported in v4 profile; cache policy is managed via standard HTTP headers (GH-049).
- **History cache rework**: v4 reworks history cache internals; restore scenarios are observed and verified in browser lanes.
- **Extensions**: `json-enc` is unsupported in v4 by default; migration diagnostics flag it via `diagnoseExtension()`.
