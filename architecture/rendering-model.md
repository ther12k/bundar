---
type: Architecture Specification
title: Document, Layout, Fragment, and Streaming Rendering
description: How layouts, document assets, fragments, async boundaries, headers, and streams compose.
tags:
- rendering
- layout
- streaming
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Document rendering

A configured layout receives content plus explicit render assets and metadata:

```tsx
function AppLayout({ title, children, assets, csrf }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>{title}</title>
        {assets.head}
      </head>
      <body>
        {children}
        {csrf.meta}
        {assets.bodyEnd}
      </body>
    </html>
  );
}
```

Asset injection is explicit in layout props; it does not rely on hidden global render context.

# Fragment rendering

Fragments do not include document chrome unless requested. They still receive request-scoped values through normal component props.

# Streaming

Streaming begins only after headers and status are fixed. Async component boundaries preserve output order unless a future explicit streaming primitive permits out-of-order partials. Abort signals cancel pending iteration and release resources. A renderer error after commitment terminates the stream and records telemetry; it does not append a fake HTML error page.

# Determinism

Identical node input and options produce byte-identical output except where the application supplies nondeterministic values. Attribute ordering is documented and snapshot-stable.
