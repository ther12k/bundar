---
type: GitHub Runbook
title: Bulk GitHub Issue Creation Runbook
description: Review-first commands for creating Bundar labels, milestones, and all 96 issues in dependency order while preserving OKF frontmatter locally.
tags:
- github
- gh-cli
- issues
- runbook
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Safety and prerequisites

Review the entire issue corpus and brand/namespace decision before running this runbook. Authenticate `gh`, select the intended repository, and run from the extracted bundle root. Commands create metadata and issues; they do not merge code or claim completion.

```bash
set -euo pipefail
gh auth status
REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
printf 'Target repository: %s\n' "$REPO"
```

# 1. Create or update labels

```bash
set -euo pipefail
gh label create 'area:assets' --color '1d76db' --force
gh label create 'area:cli' --color '1d76db' --force
gh label create 'area:core' --color '1d76db' --force
gh label create 'area:docs' --color '1d76db' --force
gh label create 'area:forms' --color '1d76db' --force
gh label create 'area:htmx' --color '1d76db' --force
gh label create 'area:jsx' --color '1d76db' --force
gh label create 'area:middleware' --color '1d76db' --force
gh label create 'area:release' --color '1d76db' --force
gh label create 'area:repo' --color '1d76db' --force
gh label create 'area:routing' --color '1d76db' --force
gh label create 'area:security' --color '1d76db' --force
gh label create 'area:testing' --color '1d76db' --force
gh label create 'good-first-issue' --color 'fbca04' --force
gh label create 'help-wanted' --color 'fbca04' --force
gh label create 'priority:p0' --color 'b60205' --force
gh label create 'priority:p1' --color 'b60205' --force
gh label create 'priority:p2' --color 'b60205' --force
gh label create 'size:l' --color 'bfdadc' --force
gh label create 'size:m' --color 'bfdadc' --force
gh label create 'size:s' --color 'bfdadc' --force
gh label create 'size:xs' --color 'bfdadc' --force
gh label create 'status:blocked' --color 'fbca04' --force
gh label create 'status:experimental' --color 'fbca04' --force
gh label create 'status:needs-decision' --color 'fbca04' --force
gh label create 'status:ready' --color 'fbca04' --force
gh label create 'type:bug' --color '6f42c1' --force
gh label create 'type:chore' --color '6f42c1' --force
gh label create 'type:decision' --color '6f42c1' --force
gh label create 'type:docs' --color '6f42c1' --force
gh label create 'type:feature' --color '6f42c1' --force
gh label create 'type:perf' --color '6f42c1' --force
gh label create 'type:release' --color '6f42c1' --force
gh label create 'type:security' --color '6f42c1' --force
gh label create 'type:test' --color '6f42c1' --force
```

# 2. Create milestones

GitHub’s milestone API returns an error when a same-title milestone already exists. The commands tolerate only that setup case; inspect existing milestones before continuing.

```bash
set -euo pipefail
REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
if ! gh api "repos/$REPO/milestones?state=all" --paginate --jq '.[].title' | grep -Fxq 'M0 — Contracts & Foundation'; then gh api --method POST "repos/$REPO/milestones" -f title='M0 — Contracts & Foundation' -f description='Freeze product, repository, evidence, benchmark, and governance contracts before framework behavior is implemented.' >/dev/null; fi
if ! gh api "repos/$REPO/milestones?state=all" --paginate --jq '.[].title' | grep -Fxq 'M1 — Bun-native HTTP Core'; then gh api --method POST "repos/$REPO/milestones" -f title='M1 — Bun-native HTTP Core' -f description='Compile a small typed application model directly into Bun.serve route tables with explicit Request/Response behavior.' >/dev/null; fi
if ! gh api "repos/$REPO/milestones?state=all" --paginate --jq '.[].title' | grep -Fxq 'M2 — Server JSX Runtime'; then gh api --method POST "repos/$REPO/milestones" -f title='M2 — Server JSX Runtime' -f description='Provide a secure server-only JSX renderer with strings, async components, documents, and streaming.' >/dev/null; fi
if ! gh api "repos/$REPO/milestones?state=all" --paginate --jq '.[].title' | grep -Fxq 'M3 — HTMX Protocol & Dual Dialects'; then gh api --method POST "repos/$REPO/milestones" -f title='M3 — HTMX Protocol & Dual Dialects' -f description='Implement a version-neutral hypermedia contract with independently testable htmx 2 and htmx 4 adapters.' >/dev/null; fi
if ! gh api "repos/$REPO/milestones?state=all" --paginate --jq '.[].title' | grep -Fxq 'M4 — Forms, Actions & Security'; then gh api --method POST "repos/$REPO/milestones" -f title='M4 — Forms, Actions & Security' -f description='Make progressive forms and business workflows secure and ergonomic without requiring JavaScript.' >/dev/null; fi
if ! gh api "repos/$REPO/milestones?state=all" --paginate --jq '.[].title' | grep -Fxq 'M5 — Tooling, Examples & Docs'; then gh api --method POST "repos/$REPO/milestones" -f title='M5 — Tooling, Examples & Docs' -f description='Provide a usable CLI, typed routes, test tools, reference applications, and adoption documentation.' >/dev/null; fi
if ! gh api "repos/$REPO/milestones?state=all" --paginate --jq '.[].title' | grep -Fxq 'M6 — Alpha Readiness'; then gh api --method POST "repos/$REPO/milestones" -f title='M6 — Alpha Readiness' -f description='Prove dual-dialect behavior, package integrity, reproducibility, and release evidence for the first alpha.' >/dev/null; fi
if ! gh api "repos/$REPO/milestones?state=all" --paginate --jq '.[].title' | grep -Fxq 'M7 — HTMX 4 GA Adoption'; then gh api --method POST "repos/$REPO/milestones" -f title='M7 — HTMX 4 GA Adoption' -f description='Revalidate against the actual htmx 4 GA contract and switch defaults only after zero-application-change conformance passes.' >/dev/null; fi
gh api "repos/$REPO/milestones?state=all" --paginate --jq '.[].title'
```

# 3. Create issues in topological order

The helper removes OKF YAML frontmatter before sending the body to GitHub, retains the local Markdown as source, and writes `stable-id<TAB>url` to `github-created-issue-map.tsv`. Stop on any failed creation; rerunning blindly can create duplicates.

```bash
set -euo pipefail
: > github-created-issue-map.tsv

strip_okf_frontmatter() {
  awk '
    NR == 1 && $0 == "---" { in_frontmatter = 1; next }
    in_frontmatter && $0 == "---" { in_frontmatter = 0; next }
    !in_frontmatter { print }
  ' "$1"
}

create_okf_issue() {
  stable_id="$1"
  title="$2"
  body_file="$3"
  milestone="$4"
  shift 4

  if gh issue list --state all --search "in:title $stable_id" --json title --jq '.[].title' | grep -Fq "$stable_id"; then
    printf 'Refusing duplicate stable ID: %s\n' "$stable_id" >&2
    return 1
  fi

  tmp="$(mktemp)"
  trap 'rm -f "$tmp"' RETURN
  strip_okf_frontmatter "$body_file" > "$tmp"
  url="$(gh issue create --title "$title" --body-file "$tmp" --milestone "$milestone" "$@")"
  printf '%s\t%s\n' "$stable_id" "$url" | tee -a github-created-issue-map.tsv
  rm -f "$tmp"
  trap - RETURN
}

create_okf_issue 'GH-001' 'GH-001 — Initialize the Bun workspace and repository skeleton' 'issues/m0/gh-001-initialize-the-bun-workspace-and-repository-skeleton.md' 'M0 — Contracts & Foundation' --label 'type:chore' --label 'area:repo' --label 'priority:p0' --label 'size:m' --label 'status:ready'
create_okf_issue 'GH-002' 'GH-002 — Add governance, licensing, security, and contribution foundations' 'issues/m0/gh-002-add-governance-licensing-security-and-contribution-foundations.md' 'M0 — Contracts & Foundation' --label 'type:docs' --label 'area:repo' --label 'priority:p0' --label 'size:s'
create_okf_issue 'GH-003' 'GH-003 — Install the OKF documentation corpus and local validator' 'issues/m0/gh-003-install-the-okf-documentation-corpus-and-local-validator.md' 'M0 — Contracts & Foundation' --label 'type:docs' --label 'area:docs' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-004' 'GH-004 — Clear the Bundar brand and public namespaces' 'issues/m0/gh-004-clear-the-bundar-brand-and-public-namespaces.md' 'M0 — Contracts & Foundation' --label 'type:decision' --label 'area:repo' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-005' 'GH-005 — Freeze public API principles and package boundaries' 'issues/m0/gh-005-freeze-public-api-principles-and-package-boundaries.md' 'M0 — Contracts & Foundation' --label 'type:decision' --label 'area:core' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-006' 'GH-006 — Create architecture-boundary test harness' 'issues/m0/gh-006-create-architecture-boundary-test-harness.md' 'M0 — Contracts & Foundation' --label 'type:test' --label 'area:testing' --label 'priority:p1' --label 'size:m'
create_okf_issue 'GH-007' 'GH-007 — Create benchmark harness with raw Bun and Hono baselines' 'issues/m0/gh-007-create-benchmark-harness-with-raw-bun-and-hono-baselines.md' 'M0 — Contracts & Foundation' --label 'type:perf' --label 'area:testing' --label 'priority:p1' --label 'size:l'
create_okf_issue 'GH-008' 'GH-008 — Create browser conformance harness for HTMX 2 and HTMX 4 lanes' 'issues/m0/gh-008-create-browser-conformance-harness-for-htmx-2-and-htmx-4-lanes.md' 'M0 — Contracts & Foundation' --label 'type:test' --label 'area:testing' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-009' 'GH-009 — Configure GitHub labels, milestones, project fields, and automation' 'issues/m0/gh-009-configure-github-labels-milestones-project-fields-and-automation.md' 'M0 — Contracts & Foundation' --label 'type:chore' --label 'area:repo' --label 'priority:p1' --label 'size:m'
create_okf_issue 'GH-010' 'GH-010 — Run and record the M0 contract-freeze gate' 'issues/m0/gh-010-run-and-record-the-m0-contract-freeze-gate.md' 'M0 — Contracts & Foundation' --label 'type:release' --label 'area:release' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-011' 'GH-011 — Create the @bundar/core package skeleton' 'issues/m1/gh-011-create-the-bundar-core-package-skeleton.md' 'M1 — Bun-native HTTP Core' --label 'type:feature' --label 'area:core' --label 'priority:p0' --label 'size:s'
create_okf_issue 'GH-012' 'GH-012 — Define route descriptor and handler types' 'issues/m1/gh-012-define-route-descriptor-and-handler-types.md' 'M1 — Bun-native HTTP Core' --label 'type:feature' --label 'area:routing' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-013' 'GH-013 — Implement App builder, grouping, and module mounting' 'issues/m1/gh-013-implement-app-builder-grouping-and-module-mounting.md' 'M1 — Bun-native HTTP Core' --label 'type:feature' --label 'area:core' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-014' 'GH-014 — Implement path normalization and route-conflict detection' 'issues/m1/gh-014-implement-path-normalization-and-route-conflict-detection.md' 'M1 — Bun-native HTTP Core' --label 'type:feature' --label 'area:routing' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-015' 'GH-015 — Compile Bundar routes to Bun.serve native route tables' 'issues/m1/gh-015-compile-bundar-routes-to-bun-serve-native-route-tables.md' 'M1 — Bun-native HTTP Core' --label 'type:feature' --label 'area:routing' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-016' 'GH-016 — Preserve the static Response fast path' 'issues/m1/gh-016-preserve-the-static-response-fast-path.md' 'M1 — Bun-native HTTP Core' --label 'type:perf' --label 'area:routing' --label 'priority:p1' --label 'size:s'
create_okf_issue 'GH-017' 'GH-017 — Implement the request context contract' 'issues/m1/gh-017-implement-the-request-context-contract.md' 'M1 — Bun-native HTTP Core' --label 'type:feature' --label 'area:core' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-018' 'GH-018 — Implement startup-composed sync and async middleware' 'issues/m1/gh-018-implement-startup-composed-sync-and-async-middleware.md' 'M1 — Bun-native HTTP Core' --label 'type:feature' --label 'area:middleware' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-019' 'GH-019 — Implement params, query, and cookie access adapters' 'issues/m1/gh-019-implement-params-query-and-cookie-access-adapters.md' 'M1 — Bun-native HTTP Core' --label 'type:feature' --label 'area:core' --label 'priority:p1' --label 'size:m'
create_okf_issue 'GH-020' 'GH-020 — Implement HttpError and the global error boundary' 'issues/m1/gh-020-implement-httperror-and-the-global-error-boundary.md' 'M1 — Bun-native HTTP Core' --label 'type:feature' --label 'area:core' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-021' 'GH-021 — Implement explicit response helpers' 'issues/m1/gh-021-implement-explicit-response-helpers.md' 'M1 — Bun-native HTTP Core' --label 'type:feature' --label 'area:core' --label 'priority:p1' --label 'size:m'
create_okf_issue 'GH-022' 'GH-022 — Implement not-found, method, and lifecycle terminal behavior' 'issues/m1/gh-022-implement-not-found-method-and-lifecycle-terminal-behavior.md' 'M1 — Bun-native HTTP Core' --label 'type:feature' --label 'area:routing' --label 'priority:p1' --label 'size:m'
create_okf_issue 'GH-023' 'GH-023 — Close the HTTP core integration and contract test matrix' 'issues/m1/gh-023-close-the-http-core-integration-and-contract-test-matrix.md' 'M1 — Bun-native HTTP Core' --label 'type:test' --label 'area:testing' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-024' 'GH-024 — Run the M1 performance and resource gate' 'issues/m1/gh-024-run-the-m1-performance-and-resource-gate.md' 'M1 — Bun-native HTTP Core' --label 'type:perf' --label 'area:testing' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-025' 'GH-025 — Run and record the M1 HTTP-core gate' 'issues/m1/gh-025-run-and-record-the-m1-http-core-gate.md' 'M1 — Bun-native HTTP Core' --label 'type:release' --label 'area:release' --label 'priority:p0' --label 'size:s'
create_okf_issue 'GH-026' 'GH-026 — Create the @bundar/jsx package and JSX type surface' 'issues/m2/gh-026-create-the-bundar-jsx-package-and-jsx-type-surface.md' 'M2 — Server JSX Runtime' --label 'type:feature' --label 'area:jsx' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-027' 'GH-027 — Implement safe text, primitive, and empty-child rendering' 'issues/m2/gh-027-implement-safe-text-primitive-and-empty-child-rendering.md' 'M2 — Server JSX Runtime' --label 'type:feature' --label 'area:jsx' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-028' 'GH-028 — Implement HTML attributes, class, style, and boolean serialization' 'issues/m2/gh-028-implement-html-attributes-class-style-and-boolean-serialization.md' 'M2 — Server JSX Runtime' --label 'type:feature' --label 'area:jsx' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-029' 'GH-029 — Implement fragments, arrays, iterables, and functional components' 'issues/m2/gh-029-implement-fragments-arrays-iterables-and-functional-components.md' 'M2 — Server JSX Runtime' --label 'type:feature' --label 'area:jsx' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-030' 'GH-030 — Implement async components and promised children' 'issues/m2/gh-030-implement-async-components-and-promised-children.md' 'M2 — Server JSX Runtime' --label 'type:feature' --label 'area:jsx' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-031' 'GH-031 — Implement explicit raw HTML and trust-boundary controls' 'issues/m2/gh-031-implement-explicit-raw-html-and-trust-boundary-controls.md' 'M2 — Server JSX Runtime' --label 'type:security' --label 'area:jsx' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-032' 'GH-032 — Implement document, doctype, head, and void-element helpers' 'issues/m2/gh-032-implement-document-doctype-head-and-void-element-helpers.md' 'M2 — Server JSX Runtime' --label 'type:feature' --label 'area:jsx' --label 'priority:p1' --label 'size:m'
create_okf_issue 'GH-033' 'GH-033 — Implement renderToString and JSX Response integration' 'issues/m2/gh-033-implement-rendertostring-and-jsx-response-integration.md' 'M2 — Server JSX Runtime' --label 'type:feature' --label 'area:jsx' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-034' 'GH-034 — Implement renderToStream with backpressure and abort handling' 'issues/m2/gh-034-implement-rendertostream-with-backpressure-and-abort-handling.md' 'M2 — Server JSX Runtime' --label 'type:feature' --label 'area:jsx' --label 'priority:p1' --label 'size:l'
create_okf_issue 'GH-035' 'GH-035 — Add typed common HTMX attributes without runtime coupling' 'issues/m2/gh-035-add-typed-common-htmx-attributes-without-runtime-coupling.md' 'M2 — Server JSX Runtime' --label 'type:feature' --label 'area:jsx' --label 'priority:p1' --label 'size:m'
create_okf_issue 'GH-036' 'GH-036 — Close JSX conformance, security, and snapshot coverage' 'issues/m2/gh-036-close-jsx-conformance-security-and-snapshot-coverage.md' 'M2 — Server JSX Runtime' --label 'type:test' --label 'area:testing' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-037' 'GH-037 — Run the M2 JSX performance and memory gate' 'issues/m2/gh-037-run-the-m2-jsx-performance-and-memory-gate.md' 'M2 — Server JSX Runtime' --label 'type:perf' --label 'area:testing' --label 'priority:p1' --label 'size:m'
create_okf_issue 'GH-038' 'GH-038 — Run and record the M2 server-JSX gate' 'issues/m2/gh-038-run-and-record-the-m2-server-jsx-gate.md' 'M2 — Server JSX Runtime' --label 'type:release' --label 'area:release' --label 'priority:p0' --label 'size:s'
create_okf_issue 'GH-039' 'GH-039 — Create @bundar/htmx and the version-neutral protocol model' 'issues/m3/gh-039-create-bundar-htmx-and-the-version-neutral-protocol-model.md' 'M3 — HTMX Protocol & Dual Dialects' --label 'type:feature' --label 'area:htmx' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-040' 'GH-040 — Define the HTMX dialect adapter interface' 'issues/m3/gh-040-define-the-htmx-dialect-adapter-interface.md' 'M3 — HTMX Protocol & Dual Dialects' --label 'type:feature' --label 'area:htmx' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-041' 'GH-041 — Implement normalized HTMX request metadata' 'issues/m3/gh-041-implement-normalized-htmx-request-metadata.md' 'M3 — HTMX Protocol & Dual Dialects' --label 'type:feature' --label 'area:htmx' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-042' 'GH-042 — Implement normalized HTMX response directives' 'issues/m3/gh-042-implement-normalized-htmx-response-directives.md' 'M3 — HTMX Protocol & Dual Dialects' --label 'type:feature' --label 'area:htmx' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-043' 'GH-043 — Implement and pin the stable HTMX 2 dialect adapter' 'issues/m3/gh-043-implement-and-pin-the-stable-htmx-2-dialect-adapter.md' 'M3 — HTMX Protocol & Dual Dialects' --label 'type:feature' --label 'area:htmx' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-044' 'GH-044 — Implement the experimental HTMX 4 beta6 dialect adapter' 'issues/m3/gh-044-implement-the-experimental-htmx-4-beta6-dialect-adapter.md' 'M3 — HTMX Protocol & Dual Dialects' --label 'type:feature' --label 'area:htmx' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-045' 'GH-045 — Implement the HTMX asset registry and local serving contract' 'issues/m3/gh-045-implement-the-htmx-asset-registry-and-local-serving-contract.md' 'M3 — HTMX Protocol & Dual Dialects' --label 'type:feature' --label 'area:assets' --label 'priority:p1' --label 'size:m'
create_okf_issue 'GH-046' 'GH-046 — Normalize HTMX lifecycle and application events' 'issues/m3/gh-046-normalize-htmx-lifecycle-and-application-events.md' 'M3 — HTMX Protocol & Dual Dialects' --label 'type:feature' --label 'area:htmx' --label 'priority:p1' --label 'size:l'
create_okf_issue 'GH-047' 'GH-047 — Add inheritance and extension compatibility helpers' 'issues/m3/gh-047-add-inheritance-and-extension-compatibility-helpers.md' 'M3 — HTMX Protocol & Dual Dialects' --label 'type:feature' --label 'area:htmx' --label 'priority:p1' --label 'size:l'
create_okf_issue 'GH-048' 'GH-048 — Implement full-page and fragment negotiation' 'issues/m3/gh-048-implement-full-page-and-fragment-negotiation.md' 'M3 — HTMX Protocol & Dual Dialects' --label 'type:feature' --label 'area:htmx' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-049' 'GH-049 — Implement cache variation and history safety policy' 'issues/m3/gh-049-implement-cache-variation-and-history-safety-policy.md' 'M3 — HTMX Protocol & Dual Dialects' --label 'type:security' --label 'area:htmx' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-050' 'GH-050 — Implement the progressive action response composer' 'issues/m3/gh-050-implement-the-progressive-action-response-composer.md' 'M3 — HTMX Protocol & Dual Dialects' --label 'type:feature' --label 'area:htmx' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-051' 'GH-051 — Implement version-neutral out-of-band and partial update intents' 'issues/m3/gh-051-implement-version-neutral-out-of-band-and-partial-update-intents.md' 'M3 — HTMX Protocol & Dual Dialects' --label 'type:feature' --label 'area:htmx' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-052' 'GH-052 — Implement redirect, location, and history helpers' 'issues/m3/gh-052-implement-redirect-location-and-history-helpers.md' 'M3 — HTMX Protocol & Dual Dialects' --label 'type:feature' --label 'area:htmx' --label 'priority:p1' --label 'size:m'
create_okf_issue 'GH-053' 'GH-053 — Close the HTMX 2 browser conformance profile' 'issues/m3/gh-053-close-the-htmx-2-browser-conformance-profile.md' 'M3 — HTMX Protocol & Dual Dialects' --label 'type:test' --label 'area:testing' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-054' 'GH-054 — Close the HTMX 4 beta browser conformance profile' 'issues/m3/gh-054-close-the-htmx-4-beta-browser-conformance-profile.md' 'M3 — HTMX Protocol & Dual Dialects' --label 'type:test' --label 'area:testing' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-055' 'GH-055 — Build the unchanged-source dual-dialect reference fixture' 'issues/m3/gh-055-build-the-unchanged-source-dual-dialect-reference-fixture.md' 'M3 — HTMX Protocol & Dual Dialects' --label 'type:test' --label 'area:testing' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-056' 'GH-056 — Run the M3 zero-handler-change dialect-switch gate' 'issues/m3/gh-056-run-the-m3-zero-handler-change-dialect-switch-gate.md' 'M3 — HTMX Protocol & Dual Dialects' --label 'type:release' --label 'area:release' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-057' 'GH-057 — Implement bounded form and request-body parsing' 'issues/m4/gh-057-implement-bounded-form-and-request-body-parsing.md' 'M4 — Forms, Actions & Security' --label 'type:feature' --label 'area:forms' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-058' 'GH-058 — Implement the Standard Schema validation adapter' 'issues/m4/gh-058-implement-the-standard-schema-validation-adapter.md' 'M4 — Forms, Actions & Security' --label 'type:feature' --label 'area:forms' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-059' 'GH-059 — Define validation results and field-error rendering data' 'issues/m4/gh-059-define-validation-results-and-field-error-rendering-data.md' 'M4 — Forms, Actions & Security' --label 'type:feature' --label 'area:forms' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-060' 'GH-060 — Implement progressive validated form actions' 'issues/m4/gh-060-implement-progressive-validated-form-actions.md' 'M4 — Forms, Actions & Security' --label 'type:feature' --label 'area:forms' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-061' 'GH-061 — Implement CSRF primitives and form middleware' 'issues/m4/gh-061-implement-csrf-primitives-and-form-middleware.md' 'M4 — Forms, Actions & Security' --label 'type:security' --label 'area:security' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-062' 'GH-062 — Define secure cookie and session integration interfaces' 'issues/m4/gh-062-define-secure-cookie-and-session-integration-interfaces.md' 'M4 — Forms, Actions & Security' --label 'type:security' --label 'area:security' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-063' 'GH-063 — Implement flash messages and out-of-band flash regions' 'issues/m4/gh-063-implement-flash-messages-and-out-of-band-flash-regions.md' 'M4 — Forms, Actions & Security' --label 'type:feature' --label 'area:forms' --label 'priority:p1' --label 'size:m'
create_okf_issue 'GH-064' 'GH-064 — Implement multipart upload policy and safe temporary-file handling' 'issues/m4/gh-064-implement-multipart-upload-policy-and-safe-temporary-file-handling.md' 'M4 — Forms, Actions & Security' --label 'type:security' --label 'area:forms' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-065' 'GH-065 — Implement page-versus-fragment error negotiation' 'issues/m4/gh-065-implement-page-versus-fragment-error-negotiation.md' 'M4 — Forms, Actions & Security' --label 'type:feature' --label 'area:htmx' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-066' 'GH-066 — Implement security headers, CSP, and nonce propagation' 'issues/m4/gh-066-implement-security-headers-csp-and-nonce-propagation.md' 'M4 — Forms, Actions & Security' --label 'type:security' --label 'area:security' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-067' 'GH-067 — Implement request budgets, timeouts, and abort propagation' 'issues/m4/gh-067-implement-request-budgets-timeouts-and-abort-propagation.md' 'M4 — Forms, Actions & Security' --label 'type:security' --label 'area:core' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-068' 'GH-068 — Close the forms and security test matrix' 'issues/m4/gh-068-close-the-forms-and-security-test-matrix.md' 'M4 — Forms, Actions & Security' --label 'type:test' --label 'area:testing' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-069' 'GH-069 — Run the M4 progressive-workflow security gate' 'issues/m4/gh-069-run-the-m4-progressive-workflow-security-gate.md' 'M4 — Forms, Actions & Security' --label 'type:release' --label 'area:release' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-070' 'GH-070 — Create the Bundar CLI package and command framework' 'issues/m5/gh-070-create-the-bundar-cli-package-and-command-framework.md' 'M5 — Tooling, Examples & Docs' --label 'type:feature' --label 'area:cli' --label 'priority:p1' --label 'size:m'
create_okf_issue 'GH-071' 'GH-071 — Implement create-bundar scaffolding' 'issues/m5/gh-071-implement-create-bundar-scaffolding.md' 'M5 — Tooling, Examples & Docs' --label 'type:feature' --label 'area:cli' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-072' 'GH-072 — Implement the Bundar development command and reload loop' 'issues/m5/gh-072-implement-the-bundar-development-command-and-reload-loop.md' 'M5 — Tooling, Examples & Docs' --label 'type:feature' --label 'area:cli' --label 'priority:p1' --label 'size:l'
create_okf_issue 'GH-073' 'GH-073 — Generate route manifests and typed URL builders' 'issues/m5/gh-073-generate-route-manifests-and-typed-url-builders.md' 'M5 — Tooling, Examples & Docs' --label 'type:feature' --label 'area:cli' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-074' 'GH-074 — Implement the in-process test client and request helpers' 'issues/m5/gh-074-implement-the-in-process-test-client-and-request-helpers.md' 'M5 — Tooling, Examples & Docs' --label 'type:feature' --label 'area:testing' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-075' 'GH-075 — Create and verify the minimal starter template' 'issues/m5/gh-075-create-and-verify-the-minimal-starter-template.md' 'M5 — Tooling, Examples & Docs' --label 'type:feature' --label 'area:docs' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-076' 'GH-076 — Build the Todo reference application' 'issues/m5/gh-076-build-the-todo-reference-application.md' 'M5 — Tooling, Examples & Docs' --label 'type:feature' --label 'area:docs' --label 'priority:p1' --label 'size:l'
create_okf_issue 'GH-077' 'GH-077 — Build the Admin CRUD reference application' 'issues/m5/gh-077-build-the-admin-crud-reference-application.md' 'M5 — Tooling, Examples & Docs' --label 'type:feature' --label 'area:docs' --label 'priority:p1' --label 'size:l'
create_okf_issue 'GH-078' 'GH-078 — Implement the HTMX 2-to-4 audit and migration linter' 'issues/m5/gh-078-implement-the-htmx-2-to-4-audit-and-migration-linter.md' 'M5 — Tooling, Examples & Docs' --label 'type:feature' --label 'area:cli' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-079' 'GH-079 — Publish generated API reference and compatibility documentation source' 'issues/m5/gh-079-publish-generated-api-reference-and-compatibility-documentation-source.md' 'M5 — Tooling, Examples & Docs' --label 'type:docs' --label 'area:docs' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-080' 'GH-080 — Write getting-started, architecture, security, and HTMX migration guides' 'issues/m5/gh-080-write-getting-started-architecture-security-and-htmx-migration-guides.md' 'M5 — Tooling, Examples & Docs' --label 'type:docs' --label 'area:docs' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-081' 'GH-081 — Run the M5 developer-experience usability gate' 'issues/m5/gh-081-run-the-m5-developer-experience-usability-gate.md' 'M5 — Tooling, Examples & Docs' --label 'type:test' --label 'area:testing' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-082' 'GH-082 — Run the complete dual-dialect end-to-end matrix' 'issues/m6/gh-082-run-the-complete-dual-dialect-end-to-end-matrix.md' 'M6 — Alpha Readiness' --label 'type:test' --label 'area:testing' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-083' 'GH-083 — Run final alpha performance and regression budgets' 'issues/m6/gh-083-run-final-alpha-performance-and-regression-budgets.md' 'M6 — Alpha Readiness' --label 'type:perf' --label 'area:testing' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-084' 'GH-084 — Audit package contents, dependencies, licenses, and size' 'issues/m6/gh-084-audit-package-contents-dependencies-licenses-and-size.md' 'M6 — Alpha Readiness' --label 'type:security' --label 'area:release' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-085' 'GH-085 — Generate SBOM, provenance, checksums, and reproducible build evidence' 'issues/m6/gh-085-generate-sbom-provenance-checksums-and-reproducible-build-evidence.md' 'M6 — Alpha Readiness' --label 'type:security' --label 'area:release' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-086' 'GH-086 — Run npm publication dry runs and export-map verification' 'issues/m6/gh-086-run-npm-publication-dry-runs-and-export-map-verification.md' 'M6 — Alpha Readiness' --label 'type:release' --label 'area:release' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-087' 'GH-087 — Write alpha release notes, compatibility statement, and known limitations' 'issues/m6/gh-087-write-alpha-release-notes-compatibility-statement-and-known-limitations.md' 'M6 — Alpha Readiness' --label 'type:docs' --label 'area:release' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-088' 'GH-088 — Run the v0.1.0-alpha.1 release gate' 'issues/m6/gh-088-run-the-v0-1-0-alpha-1-release-gate.md' 'M6 — Alpha Readiness' --label 'type:release' --label 'area:release' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-089' 'GH-089 — Record the official HTMX 4 GA source snapshot' 'issues/m7/gh-089-record-the-official-htmx-4-ga-source-snapshot.md' 'M7 — HTMX 4 GA Adoption' --label 'type:docs' --label 'area:htmx' --label 'priority:p0' --label 'size:m' --label 'status:blocked' --label 'status:experimental'
create_okf_issue 'GH-090' 'GH-090 — Diff the HTMX 4 beta adapter against the GA contract' 'issues/m7/gh-090-diff-the-htmx-4-beta-adapter-against-the-ga-contract.md' 'M7 — HTMX 4 GA Adoption' --label 'type:decision' --label 'area:htmx' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-091' 'GH-091 — Update the HTMX 4 adapter and fixtures for GA' 'issues/m7/gh-091-update-the-htmx-4-adapter-and-fixtures-for-ga.md' 'M7 — HTMX 4 GA Adoption' --label 'type:feature' --label 'area:htmx' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-092' 'GH-092 — Run dual-version regression CI against HTMX 2 and HTMX 4 GA' 'issues/m7/gh-092-run-dual-version-regression-ci-against-htmx-2-and-htmx-4-ga.md' 'M7 — HTMX 4 GA Adoption' --label 'type:test' --label 'area:testing' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-093' 'GH-093 — Prove reference applications run unchanged under HTMX 4 GA' 'issues/m7/gh-093-prove-reference-applications-run-unchanged-under-htmx-4-ga.md' 'M7 — HTMX 4 GA Adoption' --label 'type:test' --label 'area:testing' --label 'priority:p0' --label 'size:l'
create_okf_issue 'GH-094' 'GH-094 — Deprecate beta adapter paths and publish the GA migration report' 'issues/m7/gh-094-deprecate-beta-adapter-paths-and-publish-the-ga-migration-report.md' 'M7 — HTMX 4 GA Adoption' --label 'type:docs' --label 'area:htmx' --label 'priority:p1' --label 'size:m'
create_okf_issue 'GH-095' 'GH-095 — Decide the default HTMX dialect after GA evidence' 'issues/m7/gh-095-decide-the-default-htmx-dialect-after-ga-evidence.md' 'M7 — HTMX 4 GA Adoption' --label 'type:decision' --label 'area:htmx' --label 'priority:p0' --label 'size:m'
create_okf_issue 'GH-096' 'GH-096 — Release stable HTMX 4 support' 'issues/m7/gh-096-release-stable-htmx-4-support.md' 'M7 — HTMX 4 GA Adoption' --label 'type:release' --label 'area:release' --label 'priority:p0' --label 'size:l'
```

# 4. Verify creation

```bash
test "$(wc -l < github-created-issue-map.tsv | tr -d ' ')" = "96"
cut -f1 github-created-issue-map.tsv | sort | uniq -d | (! grep .)
gh issue list --state all --limit 200 --json title,url,milestone,labels > github-created-issues.json
```

# 5. Add GitHub-native dependency relationships

Stable-ID links in every issue body are already sufficient for execution. GitHub Projects sub-issues or dependency relationships may then be added using the generated mapping. Do this after verifying all URLs; never guess issue numbers. Preserve the stable IDs even after native links exist.

# Recovery

If creation stops, keep the mapping file, inspect the last issue, and resume manually from the next stable ID after confirming no duplicate exists. Do not delete and recreate issues solely to obtain consecutive numbers.
