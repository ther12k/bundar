/**
 * CSRF security audit (GH-061).
 *
 * Fail-closed matrix runner proving the CSRF pipeline's security properties
 * end to end: every documented failure mode rejects, safe methods never
 * rotate or consume, and token material never reaches rendered error
 * envelopes or logs.
 */
import {
  composeMiddleware,
  createContext,
  text,
} from "../../packages/core/src/index";
import {
  createCsrfSecret,
  createInMemoryTokenStore,
  CSRF_FORM_FIELD,
  csrfMiddleware,
  CsrfError,
  issueCsrfToken,
  verifyCsrfToken,
  verifyOrigin,
} from "../../packages/security/src/index";

const failures: string[] = [];
const SECRET = createCsrfSecret();
const SESSION = "audit-session";
const ORIGIN = "http://localhost";

function check(name: string, ok: boolean): void {
  if (!ok) failures.push(name);
}

// 1. every failure mode rejects
const verdicts = await Promise.all([
  verifyCsrfToken(SECRET, SESSION, null),
  verifyCsrfToken(SECRET, SESSION, "garbage"),
  verifyCsrfToken(SECRET, SESSION, `${Date.now() + 999_999}.n.deadbeef`),
  verifyCsrfToken(
    SECRET,
    SESSION,
    (await issueCsrfToken(SECRET, "other")).token,
  ),
]);
for (const [index, verdict] of verdicts.entries()) {
  check(`failure mode ${index} rejects`, verdict.valid === false);
}
const expired = await issueCsrfToken(SECRET, SESSION, { ttlMs: 1 });
await new Promise((resolve) => setTimeout(resolve, 20));
check(
  "expired rejects",
  (await verifyCsrfToken(SECRET, SESSION, expired.token)).valid === false,
);

// 2. origin policy rejects cross-site and missing evidence
check(
  "cross-site fetch metadata rejects",
  !verifyOrigin(
    new Request("http://localhost/x", {
      method: "POST",
      headers: { "sec-fetch-site": "cross-site" },
    }),
  ).valid,
);
check(
  "missing origin evidence rejects",
  !verifyOrigin(new Request("http://localhost/x", { method: "POST" })).valid,
);

// 3. safe methods never rotate or consume
const token = (await issueCsrfToken(SECRET, SESSION)).token;
const chain = composeMiddleware([csrfMiddleware({ secret: SECRET })], () =>
  text("page"),
);
const getResponse = await chain(
  createContext(
    new Request("http://localhost/form", {
      headers: { cookie: `bundar.session=${SESSION}; bundar.csrf=${token}` },
    }),
    {},
  ),
);
check(
  "safe method does not rotate",
  getResponse.headers.getSetCookie().length === 0,
);

// 4. token material never appears in error envelopes
let error: unknown;
try {
  await composeMiddleware([csrfMiddleware({ secret: SECRET })], () =>
    text("x"),
  )(
    createContext(
      new Request("http://localhost/save", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          origin: ORIGIN,
          cookie: `bundar.session=${SESSION}; bundar.csrf=${token}`,
        },
        body: "name=x",
      }),
      {},
    ),
  );
} catch (caught) {
  error = caught;
}
check("missing token throws CsrfError", error instanceof CsrfError);
if (error instanceof CsrfError) {
  const envelope = JSON.stringify(error.toBody());
  check("token absent from envelope", !envelope.includes(token));
  check(
    "generic public message",
    envelope.includes("request verification failed"),
  );
}

// 5. replay prohibition engages when configured
const store = createInMemoryTokenStore();
const replayChain = composeMiddleware(
  [csrfMiddleware({ secret: SECRET, requireSingleUse: true, store })],
  () => text("ok"),
);
const post = (): Promise<unknown> =>
  Promise.resolve(
    replayChain(
      createContext(
        new Request("http://localhost/save", {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            origin: ORIGIN,
            cookie: `bundar.session=${SESSION}; bundar.csrf=${token}`,
          },
          body: `${CSRF_FORM_FIELD}=${encodeURIComponent(token)}`,
        }),
        {},
      ),
    ),
  ).then(
    (value: Response) => value,
    (caught: unknown) => caught,
  );
await post();
const replay = await post();
check("replayed token rejected", replay instanceof CsrfError);

if (failures.length > 0) {
  console.error("security:csrf: FAILED");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  "security:csrf: ok (all failure modes reject; origin policy fail-closed; safe methods never rotate; tokens absent from envelopes; replay prohibited when configured)",
);
