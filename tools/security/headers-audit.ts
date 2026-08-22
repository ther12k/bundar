/**
 * Security headers audit (GH-066).
 *
 * Fail-closed proof of the header policy: mandatory CSP directives cannot
 * be overridden or silently removed; nonces are unique and present in the
 * CSP; the full header set is applied; development vs production defaults
 * differ explicitly; no unsafe-inline in production script-src.
 */
import {
  composeMiddleware,
  createContext,
  text,
} from "../../packages/core/src/index";
import {
  buildCspHeader,
  getNonce,
  securityHeaders,
  SecurityHeaderError,
} from "../../packages/security/src/index";

const failures: string[] = [];
const check = (name: string, ok: boolean): void => {
  if (!ok) failures.push(name);
};

// 1. nonces are unique
{
  const nonces = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const middleware = securityHeaders();
    void Promise.resolve(
      composeMiddleware([middleware], (context) => {
        nonces.add(getNonce(context)!.nonce);
        return text("ok");
      })(createContext(new Request("http://localhost/"), {})),
    ); // fire, collect
  }
  check("50 nonces are all unique", nonces.size === 50);
}

// 2. production CSP has no unsafe-inline for scripts
{
  const csp = buildCspHeader("audit-nonce");
  check(
    "no unsafe-inline in script-src",
    csp.includes("script-src 'self' 'nonce-audit-nonce'") &&
      !csp
        .split(";")
        .some(
          (d) =>
            d.trim().startsWith("script-src") && d.includes("unsafe-inline"),
        ),
  );
  check("object-src none", csp.includes("object-src 'none'"));
  check("frame-ancestors none", csp.includes("frame-ancestors 'none'"));
  check("base-uri self", csp.includes("base-uri 'self'"));
}

// 3. mandatory directives cannot be overridden
{
  for (const directive of [
    "default-src",
    "object-src",
    "base-uri",
    "frame-ancestors",
  ]) {
    let rejected = false;
    try {
      buildCspHeader("n", {
        extra: { [directive]: "https://evil.com" } as Record<string, string>,
      });
    } catch (error) {
      rejected = error instanceof SecurityHeaderError;
    }
    check(`${directive} override rejected`, rejected);
  }
}

// 4. full header set on production responses
{
  const middleware = securityHeaders();
  await Promise.resolve(
    composeMiddleware([middleware], () => text("body"))(
      createContext(new Request("http://localhost/"), {}),
    ),
  ).then((response) => {
    check(
      "x-content-type-options nosniff",
      response.headers.get("x-content-type-options") === "nosniff",
    );
    check(
      "x-frame-options DENY",
      response.headers.get("x-frame-options") === "DENY",
    );
    check(
      "referrer-policy set",
      response.headers.get("referrer-policy") !== null,
    );
    check(
      "permissions-policy set",
      response.headers.get("permissions-policy") !== null,
    );
    check(
      "HSTS in production",
      (response.headers.get("strict-transport-security") ?? "").includes(
        "31536000",
      ),
    );
    check(
      "COOP same-origin",
      response.headers.get("cross-origin-opener-policy") === "same-origin",
    );
  });
}

// 5. development mode: HSTS off, inline styles allowed
{
  const middleware = securityHeaders({ development: true });
  await Promise.resolve(
    composeMiddleware([middleware], () => text("body"))(
      createContext(new Request("http://localhost/"), {}),
    ),
  ).then((response) => {
    check(
      "HSTS disabled in development",
      response.headers.get("strict-transport-security") === null,
    );
    check(
      "inline styles allowed in development",
      (response.headers.get("content-security-policy") ?? "").includes(
        "unsafe-inline",
      ),
    );
  });
}

// 6. handler-set CSP cannot remove mandatory policy
{
  const middleware = securityHeaders();
  const handler = () =>
    new Response("body", {
      headers: { "content-security-policy": "img-src from-handler" },
    });
  await Promise.resolve(
    composeMiddleware(
      [middleware],
      handler,
    )(createContext(new Request("http://localhost/"), {})),
  ).then((response) => {
    const csp = response.headers.get("content-security-policy") ?? "";
    check(
      "handler CSP appended not replacing",
      csp.includes("default-src 'self'") &&
        csp.includes("img-src from-handler"),
    );
  });
}

if (failures.length > 0) {
  console.error("security:headers: FAILED");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  "security:headers: ok (nonces unique per request; mandatory CSP directives cannot be overridden; full header set applied; development mode explicit; handler CSP appended never replacing)",
);
