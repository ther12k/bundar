---
type: Protocol Specification
title: HTMX Dialect Interface
description: Version-neutral adapter contract implemented by htmx 2 and htmx 4 profiles.
tags:
- protocol
- htmx
- adapter
- typescript
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
sources:
- id: htmx-2-docs
  resource: https://htmx.org/docs/
  title: htmx 2 documentation
  author: team:htmx
  last_modified: '2026-08-21'
- id: htmx-4-docs
  resource: https://four.htmx.org/docs
  title: htmx 4 beta documentation
  author: team:htmx
  last_modified: '2026-08-21'
---

# Contract

```ts
export interface HtmxDialect {
  readonly id: string; // known adapters use 'htmx2' and 'htmx4'; tests/plugins may define others
  readonly maturity: 'stable' | 'experimental';
  readonly testedVersion: string;
  readonly capabilities: HtmxCapabilities;

  parseRequest(headers: Headers): HtmxRequestMeta;
  varyFor(view: ViewVariants, meta: HtmxRequestMeta): readonly string[];
  applyResponse(headers: Headers, directives: HtmxResponseDirectives): void;
  renderAssets(options: HtmxAssetOptions): HtmxAssetPlan;
  renderAttributeIntent(intent: HtmxAttributeIntent): HtmxAttributes;
  eventName(event: BundarHtmxEvent): string;
  renderUpdates(updates: readonly UpdateIntent[]): JSXNode;
  diagnostics(): readonly CompatibilityDiagnostic[];
}
```

# Design rules

- Adapter methods are deterministic and side-effect free except explicit asset resolution at build/startup.
- Raw headers remain available for debugging but application helpers consume normalized values.
- Capability flags describe observed behavior; they do not silently emulate every removed feature.
- A dialect records the exact tested HTMX version and emits it in build metadata.
- Experimental adapters cannot become the default through a patch release.

# No application branching

Route handlers and stable components must not switch on `dialect.id`. Version-specific rendering belongs in adapter-owned helpers or explicitly version-specific application code outside the guarantee.
