# Bundar 1.0 support matrix

> **Approved maintainer decision (GH-176, Option A with clarified evidence
> terminology).** This matrix is the authoritative statement of what Bundar
> 1.0 claims. Narrow scope is deliberate: every claim below is backed by
> repository evidence, and nothing is promised that has not been exercised.

## Runtime

| Commitment | Value |
| --- | --- |
| Runtime | **Bun-only.** No Node.js, Deno, Workers, or edge-runtime compatibility is claimed |
| Installation minimum | **Bun >= 1.4.0** — enforced by package `engines` metadata and the fail-closed `bundar preflight` check |
| Release-verified reference | **The exact Bun version pinned by the Candidate Release Battery** — currently Bun 1.4.0 |

The minimum accepted runtime and the release-verified reference runtime are
different statements. Bun >= 1.4.0 may install and run; **only the pinned
reference version has received the full compatibility battery**. Later Bun
releases are adopted through an advisory lane first and become part of the
verified matrix only after the battery passes on them — this documentation
must never imply that every newer Bun release has been conformance-tested.

## Platforms

| Platform | Status |
| --- | --- |
| **Linux x64** | ✅ Production-supported — install, build, tests, CLI, HTTP behavior, and release-consumer journeys are exercised by CI and the public battery |
| **macOS** | macOS may work for local development, but it is not part of the verified production support matrix. macOS-specific failures are handled on a best-effort basis and are not release-blocking |
| **Windows** | Not supported or claimed |
| **arm64** | Not supported or claimed |

Adding a platform later requires: a CI lane, proven clean install,
build/tests/CLI journeys, and an updated matrix. Removing an overbroad
promise is far costlier than adding a proven one — this matrix claims only
what is exercised.

## Browsers

| Engine | Status |
| --- | --- |
| **Chromium** | Bundar's browser conformance suite is verified against the Chromium revision supplied by the repository's pinned Playwright toolchain |
| **Firefox** | Explicitly out of scope (documented, not silently untested) |
| **WebKit / Safari** | Explicitly out of scope (documented, not silently untested) |

Browser evidence covers: ordinary and enhanced navigation, valid and
invalid forms, redirects/history, focus and error accessibility,
out-of-band updates, the no-JavaScript flow, the local htmx asset, and
streamed HTML. See [browsers.md](browsers.md) for the evidence record.

## HTMX

| Commitment | Value |
| --- | --- |
| Supported stable line | **htmx 2.0.x** (machine-readable: `>=2.0.0 <2.1.0`) |
| Tested reference | **htmx 2.0.10** — vendor asset pinned by SHA-256, default dialect |
| Upgrade policy | A new htmx patch becomes the tested reference **only after the full dialect and browser battery passes** on it |
| htmx 4 | **Experimental and opt-in**, non-default: `4.0.0-beta6`, no GA compatibility promise. GA claims require official htmx 4 GA, the completed contract diff, regenerated dual-dialect evidence, and an explicit maintainer default change |

The stable line is deliberately narrower than "any htmx 2 release": the
repository holds conformance evidence for the pinned reference, not an
advance promise covering every future htmx 2 minor.

## Maintenance

| Commitment | Value |
| --- | --- |
| Pre-1.0 | Only `main` and explicitly documented prereleases receive fixes |
| Cadence | Evidence-driven; **no fixed release-cadence promise** |
| Support/backport durations | **Event-based policy defined in `SECURITY.md` and `SUPPORT.md`:** newest release in each supported channel, no LTS, no guaranteed superseded-minor backports, and no calendar-duration support window |
| Deprecation | Documented before removal; breaking removals only in a major release after 1.0 |

Maintenance commitments are governed by the approved GH-178 policy in
[SECURITY.md](../../SECURITY.md) and [SUPPORT.md](../../SUPPORT.md). The
project uses event-based support boundaries rather than calendar-duration
windows.

## Provenance

Decision: GH-176, Option A (conservative) with clarified evidence
terminology — approved by the maintainer in the GH-176 decision thread.
Evidence basis: Bun version anchors (engines + preflight + battery
environment), Linux x64 CI/battery journeys, Chromium conformance record
(`artifacts/conformance/browsers.json`), htmx adapter pins
(`HTMX2_TESTED_VERSION`, `HTMX4_TESTED_VERSION`), and the absence of
macOS/Windows/arm64/Firefox/WebKit lanes.
