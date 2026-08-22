/**
 * GH-061 CSRF middleware coverage: fail-closed matrix for unsafe methods,
 * safe-method non-rotation, single-consumption body handling (the handler's
 * parseForm still works after verification), single-use replay prohibition,
 * and HTMX (header) + no-JS (hidden field) parity.
 */
import { describe, expect, test } from "bun:test";
import {
  composeMiddleware,
  createContext,
  parseForm,
  text,
} from "@bundar/core";
import type { Context } from "@bundar/core";
import {
  createCsrfSecret,
  createInMemoryTokenStore,
  CSRF_FORM_FIELD,
  CSRF_HEADER,
  csrfMiddleware,
  CsrfError,
  issueCsrfToken,
} from "../../src/index";

const SECRET = createCsrfSecret();
const SESSION = "session-abc";
const ORIGIN = "http://localhost";

function cookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

function postForm(
  body: string,
  cookies: Record<string, string>,
  extraHeaders: Record<string, string> = {},
): Request {
  return new Request("http://localhost/save", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: ORIGIN,
      cookie: cookieHeader(cookies),
      ...extraHeaders,
    },
    body,
  });
}

function getForm(cookies: Record<string, string>): Request {
  return new Request("http://localhost/form", {
    headers: { cookie: cookieHeader(cookies) },
  });
}

async function issuedToken(): Promise<string> {
  return (await issueCsrfToken(SECRET, SESSION)).token;
}

function protectedChain(
  options: {
    requireSingleUse?: boolean;
    store?: ReturnType<typeof createInMemoryTokenStore>;
  } = {},
) {
  const middleware = csrfMiddleware({
    secret: SECRET,
    ...(options.requireSingleUse !== undefined
      ? { requireSingleUse: options.requireSingleUse }
      : {}),
    ...(options.store !== undefined ? { store: options.store } : {}),
  });
  const terminal = async (context: Context): Promise<Response> => {
    // proves the body is still readable by the handler after verification
    if (context.request.method === "POST") {
      const form = await parseForm(context);
      return text(`saved:${form.get("name") ?? ""}`);
    }
    return text("page");
  };
  return composeMiddleware([middleware], terminal);
}

async function expectCsrfFailure(
  chain: (context: Context) => Response | Promise<Response>,
  requestValue: Request,
): Promise<void> {
  const context = createContext(requestValue, {});
  const error = await Promise.resolve(chain(context)).then(
    () => undefined,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(CsrfError);
  expect((error as CsrfError).status).toBe(403);
}

describe("GH-061 csrfMiddleware unsafe methods (fail-closed matrix)", () => {
  test("valid token + same-origin POST passes and the handler still reads the body", async () => {
    const token = await issuedToken();
    const chain = protectedChain();
    const context = createContext(
      postForm(`${CSRF_FORM_FIELD}=${encodeURIComponent(token)}&name=Bundar`, {
        "bundar.session": SESSION,
        "bundar.csrf": token,
      }),
      {},
    );
    const response = await chain(context);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("saved:Bundar");
  });

  test("missing submitted token fails closed with a generic 403", async () => {
    const token = await issuedToken();
    const chain = protectedChain();
    const context = createContext(
      postForm("name=Bundar", {
        "bundar.session": SESSION,
        "bundar.csrf": token,
      }),
      {},
    );
    const error = await Promise.resolve(chain(context)).then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(CsrfError);
    const csrf = error as CsrfError;
    expect(csrf.status).toBe(403);
    // token material never appears in the public envelope
    expect(csrf.message).not.toContain(token);
    expect(JSON.stringify(csrf.toBody())).not.toContain(token);
    expect(csrf.toBody().error.message).toBe("request verification failed");
  });

  test("cross-origin requests fail closed regardless of token", async () => {
    const token = await issuedToken();
    const chain = protectedChain();
    await expectCsrfFailure(
      chain,
      new Request("http://localhost/save", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          origin: "http://evil.example.net",
          cookie: cookieHeader({
            "bundar.session": SESSION,
            "bundar.csrf": token,
          }),
        },
        body: `${CSRF_FORM_FIELD}=${encodeURIComponent(token)}`,
      }),
    );
  });

  test("expired tokens fail closed", async () => {
    const shortSecret = createCsrfSecret();
    const expired = await issueCsrfToken(shortSecret, SESSION, { ttlMs: 5 });
    await new Promise((resolve) => setTimeout(resolve, 20));
    const chain = composeMiddleware(
      [csrfMiddleware({ secret: shortSecret })],
      () => text("never"),
    );
    await expectCsrfFailure(
      chain,
      postForm(`${CSRF_FORM_FIELD}=${encodeURIComponent(expired.token)}`, {
        "bundar.session": SESSION,
        "bundar.csrf": expired.token,
      }),
    );
  });

  test("tampered tokens fail closed", async () => {
    const token = await issuedToken();
    const [expiry, nonce] = token.split(".");
    const tampered = `${expiry}.${nonce}.deadbeef`;
    const chain = protectedChain();
    await expectCsrfFailure(
      chain,
      postForm(`${CSRF_FORM_FIELD}=${encodeURIComponent(tampered)}`, {
        "bundar.session": SESSION,
        "bundar.csrf": tampered,
      }),
    );
  });

  test("a token minted for a different session fails closed", async () => {
    const other = await issueCsrfToken(SECRET, "session-other");
    const chain = protectedChain();
    await expectCsrfFailure(
      chain,
      postForm(`${CSRF_FORM_FIELD}=${encodeURIComponent(other.token)}`, {
        "bundar.session": SESSION,
        "bundar.csrf": other.token,
      }),
    );
  });

  test("HTMX header submission uses the same protection as the hidden field", async () => {
    const token = await issuedToken();
    const chain = protectedChain();
    const context = createContext(
      postForm(
        "name=ViaHeader",
        { "bundar.session": SESSION, "bundar.csrf": token },
        { [CSRF_HEADER]: token },
      ),
      {},
    );
    const response = await chain(context);
    expect(await response.text()).toBe("saved:ViaHeader");
  });
});

describe("GH-061 safe methods and rotation", () => {
  test("safe methods never rotate an existing token", async () => {
    const token = await issuedToken();
    const chain = protectedChain();
    const response = await chain(
      createContext(
        getForm({ "bundar.session": SESSION, "bundar.csrf": token }),
        {},
      ),
    );
    expect(response.headers.getSetCookie().length).toBe(0);
  });

  test("safe methods issue a first-visit token when none exists", async () => {
    const chain = protectedChain();
    const response = await chain(createContext(getForm({}), {}));
    const cookies = response.headers.getSetCookie();
    expect(cookies.length).toBe(1);
    expect(cookies[0]).toContain("bundar.csrf=");
    expect(cookies[0]).toContain("HttpOnly");
    expect(cookies[0]).toContain("SameSite=Strict");
  });

  test("verified unsafe requests rotate the token cookie", async () => {
    const token = await issuedToken();
    const chain = protectedChain();
    const response = await chain(
      createContext(
        postForm(`${CSRF_FORM_FIELD}=${encodeURIComponent(token)}&name=x`, {
          "bundar.session": SESSION,
          "bundar.csrf": token,
        }),
        {},
      ),
    );
    const cookies = response.headers.getSetCookie();
    expect(cookies.length).toBe(1);
    expect(cookies[0]).not.toContain(token);
  });

  test("4xx responses change no state, so the token survives for form retries", async () => {
    // GH-069: a 422 re-render embeds the SAME token the form just
    // submitted; rotating it there would 403 the retry for no gain.
    const token = await issuedToken();
    const middleware = csrfMiddleware({ secret: SECRET });
    const chain = composeMiddleware([middleware], () =>
      text("validation failed", { status: 422 }),
    );
    const response = await chain(
      createContext(
        postForm(`${CSRF_FORM_FIELD}=${encodeURIComponent(token)}&name=x`, {
          "bundar.session": SESSION,
          "bundar.csrf": token,
        }),
        {},
      ),
    );
    expect(response.status).toBe(422);
    expect(response.headers.getSetCookie().length).toBe(0);
  });
});

describe("GH-061 single-use replay prohibition", () => {
  test("a consumed token cannot be replayed", async () => {
    const store = createInMemoryTokenStore();
    const token = await issuedToken();
    const run = (): Promise<Response> => {
      const chain = protectedChain({ requireSingleUse: true, store });
      return Promise.resolve(
        chain(
          createContext(
            postForm(`${CSRF_FORM_FIELD}=${encodeURIComponent(token)}&name=x`, {
              "bundar.session": SESSION,
              "bundar.csrf": token,
            }),
            {},
          ),
        ),
      ) as Promise<Response>;
    };
    const first = await run();
    expect(first).toBeInstanceOf(Response);
    await expect(run()).rejects.toBeInstanceOf(CsrfError);
  });
});
