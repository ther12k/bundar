/** Runnable snippet: fail-safe cache policy for fragments (GH-049). */
import {
  applyCachePolicy,
  cachePolicyFor,
  negotiateView,
  normalizeHtmxRequest,
} from "@bundar/htmx";

const request = new Request("http://x/items", {
  headers: { "hx-request": "true" },
});
const negotiated = negotiateView(normalizeHtmxRequest(request));
const policy = cachePolicyFor(negotiated);
if (!policy.cacheControl.includes("no-store")) {
  throw new Error("snippet cache-policy: fragments must fail safe");
}
const response = applyCachePolicy(
  new Response("frag", { headers: { vary: "Cookie" } }),
  policy,
);
if (response.headers.get("cache-control") === null) {
  throw new Error("snippet cache-policy: header missing");
}
