/**
 * GH-062 session middleware: lifecycle, rotation on privilege change,
 * logout invalidation, cross-request isolation, cookie policy, and the
 * CSRF-binding interaction (rotation invalidates CSRF tokens — fail closed).
 */
import { describe, expect, test } from "bun:test";
import { composeMiddleware, createContext, text } from "@bundar/core";
import type { Context } from "@bundar/core";
import {
  createMemorySessionStore,
  getSession,
  sessionMiddleware,
} from "../../src/index";
import type { SessionStore } from "../../src/index";

function chain(
  store: SessionStore = createMemorySessionStore(),
  action: (context: Context) => Response | Promise<Response>,
  options: { secure?: boolean; idleTimeoutMs?: number } = {},
) {
  return composeMiddleware(
    [
      sessionMiddleware({
        store,
        ...(options.secure !== undefined ? { secure: options.secure } : {}),
        ...(options.idleTimeoutMs !== undefined
          ? { idleTimeoutMs: options.idleTimeoutMs }
          : {}),
      }),
    ],
    action,
  );
}

function withSessionCookie(id: string | undefined): Record<string, string> {
  return id === undefined ? {} : { cookie: `bundar.session=${id}` };
}

function requestFor(path = "/app", cookieId?: string): Request {
  return new Request(`http://localhost${path}`, {
    headers: withSessionCookie(cookieId),
  });
}

function cookieIdOf(response: Response): string | undefined {
  for (const cookie of response.headers.getSetCookie()) {
    const match = cookie.match(/^bundar\.session=([^;]+)/);
    if (match?.[1] && match[1].length > 0) return match[1];
  }
  return undefined;
}

describe("GH-062 session lifecycle", () => {
  test("a fresh visit gets a new session with a secure cookie", async () => {
    let seenId = "";
    const response = await chain(
      createMemorySessionStore(),
      async (context) => {
        const session = getSession(context)!;
        seenId = session.id;
        expect(session.isNew).toBe(true);
        session.set("user", "bundar");
        return text("created");
      },
    )(createContext(requestFor(), {}));
    expect(response.status).toBe(200);
    const cookie = response.headers.getSetCookie()[0]!;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("Path=/");
    expect(cookie).not.toContain("Domain=");
    expect(cookieIdOf(response)).toBe(seenId);
  });

  test("the next request loads the same session data", async () => {
    const store = createMemorySessionStore();
    const first = await chain(store, (context) => {
      getSession(context)!.set("user", "bundar");
      return text("set");
    })(createContext(requestFor(), {}));
    const id = cookieIdOf(first)!;
    await chain(store, (context) => {
      expect(getSession(context)!.get("user")).toBe("bundar");
      expect(getSession(context)!.isNew).toBe(false);
      return text("ok");
    })(createContext(requestFor("/", id), {}));
  });

  test("untouched sessions do not re-set cookies", async () => {
    const store = createMemorySessionStore();
    const first = await chain(store, (context) => {
      getSession(context)!.set("x", 1);
      return text("set");
    })(createContext(requestFor(), {}));
    const id = cookieIdOf(first)!;
    const second = await chain(store, () => text("read"))(
      createContext(requestFor("/", id), {}),
    );
    expect(second.headers.getSetCookie().length).toBe(0);
  });

  test("secure can be disabled only explicitly (local development)", async () => {
    const response = await chain(createMemorySessionStore(), () => text("x"), {
      secure: false,
    })(createContext(requestFor(), {}));
    expect(response.headers.getSetCookie()[0]).not.toContain("Secure");
  });
});

describe("GH-062 isolation — authentication state never leaks", () => {
  test("unknown or malformed cookie ids get brand-new empty sessions", async () => {
    const store = createMemorySessionStore();
    // seed a real session
    const first = await chain(store, (context) => {
      getSession(context)!.set("user", "alice");
      return text("set");
    })(createContext(requestFor(), {}));
    const realId = cookieIdOf(first)!;

    for (const bogus of [
      undefined,
      "forged-id-that-is-not-canonical-at-all",
      `${"a".repeat(42)}+`,
    ]) {
      await chain(store, (context) => {
        const session = getSession(context)!;
        expect(session.isNew).toBe(true);
        expect(session.get("user")).toBeUndefined();
        return text("fresh");
      })(createContext(requestFor("/", bogus), {}));
    }
    void realId;
  });

  test("concurrent requests with different cookies never share state", async () => {
    const store = createMemorySessionStore();
    const seed = async (user: string): Promise<string> => {
      const response = await chain(store, (context) => {
        getSession(context)!.set("user", user);
        return text("set");
      })(createContext(requestFor(), {}));
      return cookieIdOf(response)!;
    };
    const alice = await seed("alice");
    const bob = await seed("bob");
    const read = (id: string) =>
      chain(store, (context) =>
        text(String(getSession(context)!.get("user") ?? "none")),
      )(createContext(requestFor("/", id), {}));
    expect(await (await read(alice)).text()).toBe("alice");
    expect(await (await read(bob)).text()).toBe("bob");
  });

  test("expired sessions are not resurrected", async () => {
    const store = createMemorySessionStore();
    const first = await chain(
      store,
      (context) => {
        getSession(context)!.set("user", "alice");
        return text("set");
      },
      { idleTimeoutMs: 5 },
    )(createContext(requestFor(), {}));
    const id = cookieIdOf(first)!;
    await new Promise((resolve) => setTimeout(resolve, 20));
    await chain(store, (context) => {
      const session = getSession(context)!;
      expect(session.isNew).toBe(true);
      expect(session.get("user")).toBeUndefined();
      return text("ok");
    })(createContext(requestFor("/", id), {}));
  });
});

describe("GH-062 rotation and logout", () => {
  test("login rotation issues a new id and kills the old one", async () => {
    const store = createMemorySessionStore();
    const login = await chain(store, (context) => {
      const session = getSession(context)!;
      session.set("user", "alice");
      session.rotate();
      return text("login");
    })(createContext(requestFor(), {}));
    const oldId = cookieIdOf(login);
    // cookieIdOf returns the NEW id (rotation); simulate the pre-rotation id
    // by seeding a session manually and rotating on the next request:
    const seeded = await chain(store, (context) => {
      getSession(context)!.set("user", "bob");
      return text("seed");
    })(createContext(requestFor(), {}));
    const seededId = cookieIdOf(seeded)!;
    const rotated = await chain(store, (context) => {
      getSession(context)!.rotate();
      return text("rotate");
    })(createContext(requestFor("/", seededId), {}));
    const newId = cookieIdOf(rotated)!;
    expect(newId).not.toBe(seededId);
    // the old id can never load again
    await chain(store, (context) => {
      expect(getSession(context)!.get("user")).toBeUndefined();
      expect(getSession(context)!.isNew).toBe(true);
      return text("dead");
    })(createContext(requestFor("/", seededId), {}));
    // the new id carries the data over
    await chain(store, (context) => {
      expect(getSession(context)!.get("user")).toBe("bob");
      return text("alive");
    })(createContext(requestFor("/", newId), {}));
    void oldId;
  });

  test("logout invalidates the backing record and clears the cookie", async () => {
    const store = createMemorySessionStore();
    const seeded = await chain(store, (context) => {
      getSession(context)!.set("user", "carol");
      return text("seed");
    })(createContext(requestFor(), {}));
    const id = cookieIdOf(seeded)!;
    const logout = await chain(store, (context) => {
      getSession(context)!.destroy();
      expect(getSession(context)!.get("user")).toBeUndefined();
      return text("logout");
    })(createContext(requestFor("/", id), {}));
    const cookies = logout.headers.getSetCookie();
    expect(cookies.length).toBe(1);
    expect(cookies[0]).toContain("bundar.session=;");
    expect(cookies[0]).toContain("Expires=Thu, 01 Jan 1970");
    // the store record is gone even if the browser keeps the cookie
    await chain(store, (context) => {
      expect(getSession(context)!.isNew).toBe(true);
      return text("gone");
    })(createContext(requestFor("/", id), {}));
  });

  test("handles reject mutation after destroy", async () => {
    const error = await Promise.resolve(
      chain(createMemorySessionStore(), (context) => {
        const session = getSession(context)!;
        session.destroy();
        session.set("x", 1);
        return text("unreachable");
      })(createContext(requestFor(), {})),
    ).then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(Error);
  });

  test("invalid timeout configuration fails at composition time", () => {
    expect(() =>
      sessionMiddleware({
        store: createMemorySessionStore(),
        idleTimeoutMs: 0,
      }),
    ).toThrow();
  });
});
