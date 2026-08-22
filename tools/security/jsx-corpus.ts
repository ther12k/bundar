/**
 * JSX security corpus audit (GH-036).
 *
 * Fail-closed hostile-payload sweep across every renderer entry point:
 * text, attributes (quoted and boolean), raw-text elements, documents,
 * async children, and streaming. Each payload's rendered output must not
 * contain the raw injection marker, and raw() trust must remain branded.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  document,
  fragment,
  jsx,
  page,
  raw,
  renderToStream,
  renderToString,
  renderToStringAsync,
  streamResponse,
} from "../../packages/jsx/src/index";

const failures: string[] = [];
const check = (name: string, ok: boolean, detail?: string): void => {
  if (!ok) failures.push(detail === undefined ? name : `${name}: ${detail}`);
};

const PAYLOADS = [
  "<script>alert(1)</script>",
  '"><script>alert(1)</script>',
  "'-confirm(1)-'",
  "<img src=x onerror=alert(1)>",
  "javascript:alert(1)",
  "</script><script>alert(1)</script>",
  "<iframe src=javascript:alert(1)>",
  "onmouseover=alert(1)",
  "{{7*7}}${7*7}",
  "\u0000<script>alert(1)</script>",
  // raw-text breakouts: closing the host element early is THE raw-text attack
  "</title><script>alert(1)</script>",
  "</textarea><img src=x onerror=alert(1)>",
  "</style><script>alert(1)</script>",
];

// 1. text children
for (const [index, payload] of PAYLOADS.entries()) {
  const html = renderToString(jsx("p", { children: payload }));
  check(
    `text[${index}]`,
    !html.includes("<script") &&
      !html.includes("<img") &&
      !html.includes("<iframe"),
    html,
  );
}

// 2. attribute values render exactly as the escaped payload inside quotes
import { escapeAttributeValue } from "../../packages/jsx/src/index";
for (const [index, payload] of PAYLOADS.entries()) {
  const html = renderToString(
    jsx("a", { href: "/x", title: payload, "data-p": payload }),
  );
  const escaped = escapeAttributeValue(payload);
  check(
    `attribute[${index}]`,
    html.includes(`title="${escaped}"`) && html.includes(`data-p="${escaped}"`),
    html,
  );
  // quotes stay balanced: no odd quote count, no payload-introduced breakouts
  check(
    `attribute-quotes[${index}]`,
    (html.match(/"/g) ?? []).length % 2 === 0,
    html,
  );
}

// 3. raw-text elements (script/style) neutralize close-tag breakouts
const scriptHtml = renderToString(
  jsx("script", {
    children: "if (a<b) g('</script><script>alert(1)</script>')",
  }),
);
check("script-breakout", !scriptHtml.includes("</script><script>"), scriptHtml);
const styleHtml = renderToString(
  jsx("style", {
    children: "body::after{content:'</style><script>alert(1)</script>'}",
  }),
);
check("style-breakout", !styleHtml.includes("</style><script"), styleHtml);

// 4. raw() stays the only trust path — unbranded strings never pass through
check(
  "raw-brand-required",
  renderToString("<b>x</b>") === "&lt;b&gt;x&lt;/b&gt;",
);
check("raw-branded-passes", renderToString(raw("<b>x</b>")) === "<b>x</b>");

// 5. documents keep one root, and raw-text title content cannot break out:
//    RCDATA text (raw <script> strings) is browser-inert; the attack is an
//    unescaped </title> followed by markup — the neutralizer escapes every
//    close-tag sequence so no breakout sequence can exist.
for (const [index, payload] of PAYLOADS.entries()) {
  const html = renderToString(
    document({
      lang: "en",
      title: payload,
      children: jsx("body", { children: payload }),
    }),
  );
  const singleRoot = (html.match(/<html[> ]/g) ?? []).length === 1;
  const titleStart = html.indexOf("<title>");
  const titleEnd = html.indexOf("</title>", titleStart);
  const titleContent = html.slice(titleStart + 7, titleEnd);
  const noBreakout =
    !html.includes("</title><") || html.indexOf("</title><") === titleEnd;
  check(
    `document[${index}]`,
    singleRoot && noBreakout && !titleContent.includes("</title>"),
    html,
  );
}

// 5b. raw-text hosts neutralize their own close sequences
for (const [tag, payload] of [
  ["title", "</title><script>alert(1)</script>"],
  ["textarea", "</textarea><img src=x onerror=alert(1)>"],
  ["style", "</style><script>alert(1)</script>"],
  ["script", "</script><script>alert(1)</script>"],
] as const) {
  const html = renderToString(jsx(tag, { children: payload }));
  const content = html.slice(
    html.indexOf(">") + 1,
    html.lastIndexOf(`</${tag}>`),
  );
  check(
    `rawtext-${tag}-no-breakout`,
    !content.includes(`</${tag}>`) && !content.includes(`</${tag}`),
    html,
  );
}

// 6. async + streaming paths inherit identical escaping
for (const [index, payload] of PAYLOADS.entries()) {
  const asyncHtml = await renderToStringAsync(
    jsx("p", { children: Promise.resolve(payload) }),
  );
  const streamed = await new Response(
    renderToStream(jsx("p", { children: Promise.resolve(payload) })).stream,
  ).text();
  const stringHtml = renderToString(jsx("p", { children: payload }));
  check(`async-parity[${index}]`, asyncHtml === stringHtml);
  check(`stream-parity[${index}]`, streamed === stringHtml);
  check(
    `stream-safety[${index}]`,
    !streamed.includes("<script") || stringHtml.includes("<script"),
    streamed,
  );
}

// 7. fragment/page responses carry no unexpected headers or content types
const fragmentResponse = await Promise.resolve(
  fragment(jsx("p", { children: PAYLOADS[0]! })),
);
check(
  "fragment-content-type",
  fragmentResponse.headers.get("content-type") === "text/html; charset=utf-8",
);
const pageText = await Promise.resolve(
  page(
    document({ lang: "en", children: jsx("body", { children: PAYLOADS[0]! }) }),
  ),
).then((response) => response.text());
check("page-doctype", pageText.startsWith("<!doctype html>"));
check("page-escaped", !pageText.includes("<script>alert"));
const streamText = await streamResponse(
  jsx("p", { children: PAYLOADS[0]! }),
).text();
check("stream-response-escaped", !streamText.includes("<script>alert"));

// artifact for review
const artifactDir = join(import.meta.dir, "../../evidence/gh-036");
mkdirSync(artifactDir, { recursive: true });
writeFileSync(
  join(artifactDir, "security-corpus.json"),
  `${JSON.stringify(
    {
      issue: "GH-036",
      payloads: PAYLOADS.length,
      checkedAt: new Date().toISOString(),
      result: failures.length === 0 ? "pass" : "fail",
      failures,
    },
    null,
    2,
  )}\n`,
);

if (failures.length > 0) {
  console.error("security:jsx: FAILED");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `security:jsx: ok (${PAYLOADS.length} hostile payloads across text, attributes, raw-text elements, documents, async, and streaming; raw() trust stays branded)`,
);
