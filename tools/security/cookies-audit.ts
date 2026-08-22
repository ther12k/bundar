/**
 * Cookie/session security audit (GH-062).
 *
 * Fail-closed runtime proof of the session cookie policy and lifecycle
 * guarantees, plus a static check that production documentation states the
 * durable-store and key-management requirements:
 *
 * 1. issued cookies carry HttpOnly, SameSite=Lax, Path=/, Secure, and an
 *    expiry; no Domain by default;
 * 2. Secure is only omitted when explicitly disabled;
 * 3. rotation issues a new id and makes the old id permanently unloadable;
 * 4. logout destroys the backing record and clears the cookie;
 * 5. unknown ids never resurrect state;
 * 6. docs/guides/sessions.md contains the production requirement.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  composeMiddleware,
  createContext,
  text,
} from "../../packages/core/src/index";
import type { Context } from "../../packages/core/src/index";
import {
  createMemorySessionStore,
  getSession,
  sessionMiddleware,
} from "../../packages/security/src/index";
import type { SessionStore } from "../../packages/security/src/index";

const failures: string[] = [];
const check = (name: string, ok: boolean): void => {
  if (!ok) failures.push(name);
};

function run(
  store: SessionStore,
  action: (context: Context) => Response | Promise<Response>,
  cookieId?: string,
  options: { secure?: boolean } = {},
): Promise<Response> {
  const middleware = sessionMiddleware({
    store,
    ...(options.secure !== undefined ? { secure: options.secure } : {}),
  });
  return Promise.resolve(
    composeMiddleware(
      [middleware],
      action,
    )(
      createContext(
        new Request("http://localhost/", {
          headers:
            cookieId === undefined
              ? {}
              : { cookie: `bundar.session=${cookieId}` },
        }),
        {},
      ),
    ),
  );
}

function cookieOf(response: Response): string | undefined {
  return response.headers.getSetCookie()[0];
}

// 1. cookie policy on first issue
const store = createMemorySessionStore();
const issued = await run(store, () => text("ok"));
const cookie = cookieOf(issued);
check("cookie issued", cookie !== undefined);
if (cookie !== undefined) {
  check("HttpOnly", cookie.includes("HttpOnly"));
  check("SameSite=Lax", cookie.includes("SameSite=Lax"));
  check("Path=/", cookie.includes("Path=/"));
  check("Secure by default", cookie.includes("Secure"));
  check("no Domain by default", !cookie.includes("Domain="));
  check("expiry aligned", cookie.includes("Expires="));
}
const issuedId = cookie?.match(/^bundar\.session=([^;]+)/)?.[1];

// 2. Secure only omitted when explicitly disabled
const insecure = await run(
  createMemorySessionStore(),
  () => text("ok"),
  undefined,
  { secure: false },
);
check(
  "Secure omitted only when disabled",
  (cookieOf(insecure) ?? "").includes("Secure") === false,
);

// 3. rotation kills the old id
await run(
  store,
  (context) => {
    getSession(context)!.set("user", "audit");
    return text("seed");
  },
  issuedId,
);
const seededId = cookieOf(
  await run(store, () => text("refresh"), issuedId),
)?.match(/^bundar\.session=([^;]+)/)?.[1];
void seededId;
const rotated = await run(
  store,
  (context) => {
    getSession(context)!.rotate();
    return text("rotate");
  },
  issuedId,
);
const rotatedId = cookieOf(rotated)?.match(/^bundar\.session=([^;]+)/)?.[1];
check(
  "rotation issues a new id",
  rotatedId !== undefined && rotatedId !== issuedId,
);
const afterRotation = await run(
  store,
  (context) => {
    getSession(context)!.set("probe", 1);
    return text(String(getSession(context)!.get("user") ?? "none"));
  },
  issuedId,
);
check(
  "old id cannot load state after rotation",
  (await afterRotation.text()) === "none",
);

// 4. logout destroys the record and clears the cookie
const logout = await run(
  store,
  (context) => {
    getSession(context)!.destroy();
    return text("logout");
  },
  rotatedId,
);
const logoutCookie = cookieOf(logout);
check(
  "logout clears the cookie",
  logoutCookie !== undefined && logoutCookie.includes("bundar.session=;"),
);
const afterLogout = await run(
  store,
  (context) => text(String(getSession(context)!.get("user") ?? "none")),
  rotatedId,
);
check("record gone after logout", (await afterLogout.text()) === "none");

// 5. unknown ids never resurrect state
const unknown = await run(
  store,
  (context) => text(String(getSession(context)!.get("user") ?? "none")),
  `${"A".repeat(43)}`,
);
check("unknown id yields empty session", (await unknown.text()) === "none");

// 6. production documentation requirement
const guide = readFileSync(
  join(import.meta.dir, "../../docs/guides/sessions.md"),
  "utf8",
);
check("docs require a durable store", guide.includes("durable session store"));
check("docs require key management", guide.includes("key material"));

if (failures.length > 0) {
  console.error("security:cookies: FAILED");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  "security:cookies: ok (cookie policy enforced; rotation kills old ids; logout invalidates record+cookie; unknown ids stay empty; production docs require a durable store with key management)",
);
