import { describe, expect, test } from "bun:test";
import { CookieJar, responseCookies } from "../src/cookies";

describe("BR-092 CookieJar browser-aware lifecycle", () => {
  test("Max-Age=0 or negative clears the cookie immediately", () => {
    const jar = new CookieJar();
    jar.set("auth", "token123");
    expect(jar.get("auth")).toBe("token123");

    const res = new Response(null, {
      headers: { "set-cookie": "auth=; Max-Age=0" },
    });
    jar.absorb(res);
    expect(jar.get("auth")).toBeUndefined();
    expect(jar.size).toBe(0);
  });

  test("Expires in the past clears the cookie", () => {
    const jar = new CookieJar();
    jar.set("track", "abc");
    expect(jar.get("track")).toBe("abc");

    const res = new Response(null, {
      headers: {
        "set-cookie": "track=abc; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      },
    });
    jar.absorb(res);
    expect(jar.get("track")).toBeUndefined();
  });

  test("Path scoping filters cookies sent in header", () => {
    const jar = new CookieJar();
    jar.absorb(
      new Response(null, {
        headers: [
          ["set-cookie", "root_cookie=1; Path=/"],
          ["set-cookie", "api_cookie=2; Path=/api"],
          ["set-cookie", "users_cookie=3; Path=/api/users"],
        ],
      }),
    );

    // Root path request only sees root_cookie
    expect(jar.header("http://localhost/")).toBe("root_cookie=1");
    expect(jar.header("http://localhost/dashboard")).toBe("root_cookie=1");

    // /api request sees root_cookie and api_cookie
    const apiHeader = jar.header("http://localhost/api");
    expect(apiHeader).toContain("root_cookie=1");
    expect(apiHeader).toContain("api_cookie=2");
    expect(apiHeader).not.toContain("users_cookie=3");

    // /api/users request sees all three
    const usersHeader = jar.header("http://localhost/api/users/42");
    expect(usersHeader).toContain("root_cookie=1");
    expect(usersHeader).toContain("api_cookie=2");
    expect(usersHeader).toContain("users_cookie=3");
  });

  test("Domain scoping filters cookies based on host", () => {
    const jar = new CookieJar();
    jar.absorb(
      new Response(null, {
        headers: [
          ["set-cookie", "wild_domain=yes; Domain=example.com"],
          ["set-cookie", "sub_domain=yes; Domain=api.example.com"],
        ],
      }),
    );

    const subHeader = jar.header("http://api.example.com/test");
    expect(subHeader).toContain("wild_domain=yes");
    expect(subHeader).toContain("sub_domain=yes");

    const otherHeader = jar.header("http://other.org/test");
    expect(otherHeader).toBe("");
  });

  test("responseCookies helper extracts multiple Set-Cookie entries", () => {
    const res = new Response(null, {
      headers: [
        ["set-cookie", "a=1; Path=/"],
        ["set-cookie", "b=2; Secure"],
      ],
    });
    const map = responseCookies(res);
    expect(map.get("a")).toBe("1");
    expect(map.get("b")).toBe("2");
  });
});
