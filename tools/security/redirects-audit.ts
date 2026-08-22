/**
 * Redirect & navigation security audit (GH-052).
 *
 * Fail-closed proof that open redirects, dangerous schemes, protocol-relative
 * URLs, and CRLF injection cannot pass through the navigation helpers.
 */
import {
  composeNavigation,
  htmxLocation,
  htmxRedirect,
  htmxRefresh,
  validateRedirectUrl,
  InvalidRedirectUrlError,
} from "../../packages/htmx/src/index";

const failures: string[] = [];
const check = (name: string, ok: boolean, detail?: string): void => {
  if (!ok) failures.push(detail === undefined ? name : `${name}: ${detail}`);
};

const HOSTILE_URLS = [
  "//evil.com",
  "//evil.com/path",
  "///evil.com",
  "javascript:alert(1)",
  "JAVASCRIPT:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "vbscript:msgbox(1)",
  "https://evil.example.com",
  "http://attacker.com/steal?cookie=1",
  "/safe\r\nSet-Cookie: pwned=true",
  "/safe\nLocation: http://evil.com",
  "/safe\0null",
];

for (const hostile of HOSTILE_URLS) {
  let rejected = false;
  try {
    validateRedirectUrl(hostile, { baseOrigin: "https://app.example.com" });
  } catch (error) {
    rejected = error instanceof InvalidRedirectUrlError;
  }
  check(`rejects hostile URL: ${hostile}`, rejected);
}

// Allowed origins
const allowed = validateRedirectUrl("https://auth.company.com/login", {
  baseOrigin: "https://app.company.com",
  allowedOrigins: ["https://auth.company.com"],
});
check(
  "allows explicitly listed external origin",
  allowed === "https://auth.company.com/login",
);

// Normal vs Enhanced navigation behavior
const ordinaryReq = new Request("http://localhost/action", { method: "POST" });
const ordinaryRes = composeNavigation(ordinaryReq, "/profile");
check(
  "ordinary request gets 303 Location",
  ordinaryRes.status === 303 &&
    ordinaryRes.headers.get("location") === "/profile",
);

const htmxReq = new Request("http://localhost/action", {
  method: "POST",
  headers: { "HX-Request": "true" },
});
const htmxRes = htmxRedirect(htmxReq, "/profile");
check(
  "enhanced request gets 200 HX-Redirect",
  htmxRes.status === 200 &&
    htmxRes.headers.get("hx-redirect") === "/profile" &&
    htmxRes.headers.get("location") === null,
);

const locationRes = htmxLocation(htmxReq, { path: "/cards", target: "#main" });
check(
  "htmxLocation emits 200 HX-Location",
  locationRes.status === 200 &&
    locationRes.headers.get("hx-location") === "/cards",
);

const refreshRes = htmxRefresh();
check(
  "htmxRefresh emits 200 HX-Refresh",
  refreshRes.status === 200 && refreshRes.headers.get("hx-refresh") === "true",
);

if (failures.length > 0) {
  console.error("security:redirects: FAILED");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  "security:redirects: ok (open redirects, protocol-relative URLs, javascript schemes, CRLF injection, and unlisted domains rejected; navigation headers verified)",
);
