# HTMX 2 Compatibility Profile

Bundar's default, production-ready dialect is pinned to **htmx 2.0.10**.

## Pinned profile facts

- **Tested version**: `2.0.10`
- **Asset SHA-256**: `71ea67185bfa8c98c39d31717c6fce5d852370fcdfd129db4543774d3145c0de`
- **Maturity**: Stable
- **Local serving**: Offline by default via `createHtmxAssetHandler()` and `<HtmxScript>`. No remote CDN dependencies.

## Verified browser capabilities

The stable browser conformance suite (`artifacts/conformance/htmx2.json`) verifies 19 distinct browser scenarios under Chrome for Testing:

1. **Request normalization**: `HX-Request`, `HX-Boosted`, `HX-Target`, `HX-Current-URL`, `HX-Prompt`, `HX-Trigger`.
2. **Response directives**: `HX-Location`, `HX-Push-URL`, `HX-Redirect`, `HX-Refresh`, `HX-Replace-URL`, `HX-Reselect`, `HX-Reswap`, `HX-Retarget`, `HX-Trigger`.
3. **Full-page & fragment negotiation**: single route serves complete document to normal browsers and fragments to HTMX, with `Vary: HX-Request, HX-Boosted, HX-History-Restore-Request`.
4. **Boosted navigation**: body-swapping full document navigation.
5. **Action composer & PRG fallback**: 303 Location redirect for normal forms, HTML + trigger directives for enhanced requests.
6. **Error negotiation**: 422 form region re-rendering with server-known retarget hints; 401/403 safe document path.
7. **CSRF protection**: synchronizer tokens in hidden field and `x-csrf-token` header; token rotation.
8. **Session lifecycle**: login-rotate, whoami, logout, and cookie invalidation.
9. **Out-of-band updates**: multi-region DOM updates (`replace-element`, `append`) via `hx-swap-oob`.
10. **History restore**: browser back/forward navigation restores document without installing fragments.
11. **Open-redirect defense**: protocol-relative URLs (`//evil.com`) and dangerous schemes rejected.
12. **Asset serving**: local asset handler with ETag matching SHA-256, 304 Not Modified, and immutable cache.

## Explicitly unsupported features

To protect server security and maintainability, certain features from upstream htmx 2 are intentionally unsupported or moved to extensions:

- `hx-vals js:`: Client-side JS evaluation in attributes is unsupported to prevent XSS escalation.
- Direct WebSocket & SSE in core: Managed via official extension adapters (`@bundar/htmx` extension helpers).
- Unbounded body parsing: Bounded by `DEFAULT_BODY_LIMITS` and `UploadPolicy`.
