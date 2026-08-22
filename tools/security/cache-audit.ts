/**
 * Cache/history security audit (GH-049).
 *
 * Fail-closed proof of the cache-safety properties: the policy's Vary keeps
 * every negotiation variant distinct in a simulated shared cache, missing
 * Vary demonstrably poisons (the reproduced risk), private/no-store
 * responses are never stored, unsafe policy combinations are rejected, and
 * Vary merging never loses values.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyCachePolicy,
  cachePolicyFor,
  CachePolicyError,
  historyPolicyFor,
  mergeVary,
  negotiateView,
  normalizeHtmxRequest,
  VIEW_VARY_HEADERS,
} from "../../packages/htmx/src/index";
import { htmx2 } from "../../packages/htmx/src/dialects/v2/index";
import { htmx4Experimental } from "../../packages/htmx/src/dialects/v4/index";
import { SimulatedProxyCache } from "../../tests/proxy-cache/simulated-proxy";

const failures: string[] = [];
const check = (name: string, ok: boolean, detail?: string): void => {
  if (!ok) failures.push(detail === undefined ? name : `${name}: ${detail}`);
};

const URL_PATH = "http://localhost/audit";

// 1. every negotiation variant stays distinct under the policy
{
  const cache = new SimulatedProxyCache();
  const variants: Array<[Record<string, string>, string]> = [
    [{}, "doc"],
    [{ "HX-Request": "true" }, "frag"],
    [{ "HX-Request": "true", "HX-Boosted": "true" }, "boosted"],
    [{ "HX-Request": "true", "HX-History-Restore-Request": "true" }, "restore"],
  ];
  for (const [headers, body] of variants) {
    const negotiated = negotiateView(
      normalizeHtmxRequest(new Request(URL_PATH, { headers })),
    );
    const response = applyCachePolicy(
      new Response(body),
      cachePolicyFor(negotiated, { sMaxage: 60 }),
    );
    cache.store(response, URL_PATH, body, new Headers(Object.entries(headers)));
  }
  check("all four variants stored distinctly", cache.variants(URL_PATH) === 4);
  for (const [headers, body] of variants) {
    const hit = cache.lookup(URL_PATH, new Headers(Object.entries(headers)));
    check(`variant ${body} served correctly`, hit?.body === body);
  }
}

// 2. missing Vary reproduces the poisoning risk (the documented danger)
{
  const cache = new SimulatedProxyCache();
  const bare = () =>
    new Response("x", { headers: { "cache-control": "public, s-maxage=60" } });
  cache.store(bare(), URL_PATH, "doc", new Headers());
  cache.store(bare(), URL_PATH, "frag", new Headers({ "HX-Request": "true" }));
  check(
    "missing Vary poisons (single body for all variants)",
    cache.variants(URL_PATH) === 1 &&
      cache.lookup(URL_PATH, new Headers())?.body === "frag",
  );
}

// 3. private/no-store never stored
{
  const cache = new SimulatedProxyCache();
  const negotiated = negotiateView(normalizeHtmxRequest(new Request(URL_PATH)));
  check(
    "private never stored",
    !cache.store(
      applyCachePolicy(
        new Response("secret"),
        cachePolicyFor(negotiated, { private: true }),
      ),
      URL_PATH,
      "secret",
      new Headers(),
    ),
  );
  check(
    "default no-store never stored",
    !cache.store(
      applyCachePolicy(new Response("x"), cachePolicyFor(negotiated)),
      URL_PATH,
      "x",
      new Headers(),
    ),
  );
}

// 4. unsafe policy combinations rejected
{
  let rejected = false;
  try {
    cachePolicyFor(negotiateView(normalizeHtmxRequest(new Request(URL_PATH))), {
      private: true,
      sMaxage: 30,
    });
  } catch (error) {
    rejected = error instanceof CachePolicyError;
  }
  check("private + s-maxage rejected", rejected);
  rejected = false;
  try {
    cachePolicyFor(negotiateView(normalizeHtmxRequest(new Request(URL_PATH))), {
      sMaxage: 10,
      maxAge: 30,
    });
  } catch (error) {
    rejected = error instanceof CachePolicyError;
  }
  check("max-age > s-maxage rejected", rejected);
}

// 5. Vary merge never loses values
{
  check(
    "vary merge lossless",
    mergeVary("Cookie, Accept", VIEW_VARY_HEADERS) ===
      "Cookie, Accept, HX-Request, HX-Boosted, HX-History-Restore-Request",
  );
}

// 6. history facts exist and differ explicitly per dialect
{
  const v2 = historyPolicyFor(htmx2);
  const v4 = historyPolicyFor(htmx4Experimental);
  check("v2 restore header known", v2.restoreRequestHeader !== null);
  check("v4 differences surfaced", v4.notes.length > v2.notes.length);
}

const artifactDir = join(import.meta.dir, "../../evidence/gh-049");
mkdirSync(artifactDir, { recursive: true });
writeFileSync(
  join(artifactDir, "cache-audit.json"),
  `${JSON.stringify(
    {
      issue: "GH-049",
      checkedAt: new Date().toISOString(),
      result: failures.length === 0 ? "pass" : "fail",
      failures,
    },
    null,
    2,
  )}\n`,
);

if (failures.length > 0) {
  console.error("security:cache: FAILED");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  "security:cache: ok (variants distinct under policy Vary; missing Vary poisoning reproduced as the documented risk; private/no-store never stored; unsafe combinations rejected; Vary merge lossless; per-dialect history facts explicit)",
);
