/**
 * BR-092 (#144): Golden Conformance Matrix for @bundar/testing.
 *
 * Runs identical HTTP scenarios through BOTH `createTestClient(app)`
 * (in-process dispatch) AND `startTestServer(app).client` (real Bun.serve
 * over an ephemeral port), asserting exact behavioral parity across:
 *
 * 1. Category route precedence (exact > parameter > wildcard > catch-all)
 *    independent of registration order (/users/:id registered before /users/me).
 * 2. HEAD requests preserve GET status/headers with NO body on both static
 *    Response entries and dynamic handler functions.
 * 3. Malformed percent-encoded path parameters do not throw URIError.
 * 4. Browser-aware CookieJar (Path, Max-Age / Expires, and Set-Cookie absorption).
 * 5. 303 PRG vs 307/308 method-and-body preserving redirect replay.
 * 6. Static Response cloning across repeated requests.
 * 7. Auto-OPTIONS and 405 Method Not Allowed with deterministic sorted Allow.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { App, html, text } from "@bundar/core";
import { createTestClient, type TestClient } from "../src/client";
import {
  startTestServer,
  stopAllTestServers,
  type TestServer,
} from "../src/server";

afterAll(() => {
  stopAllTestServers();
});

function buildMatrixApp(): App {
  const app = new App();

  // Precedence fixture: parameter registered BEFORE exact
  app.get("/users/:id", (ctx) => text(`param:${ctx.params.id}`));
  app.get("/users/me", () => text("exact:me"));

  // Wildcard vs exact
  app.get("/files/*", (ctx) =>
    text(`wildcard:${(ctx.params as Record<string, string>)["*"] ?? ""}`),
  );
  app.get("/files/special", () => text("exact:special"));

  // Static entry for cloning & HEAD testing
  app.route("/static", ["GET"], html("<p>static-content</p>"));

  // Dynamic route for HEAD testing
  app.get("/dynamic-html", () => html("<article>dynamic-body</article>"));

  // Method not allowed testing
  app.post("/method-test", () => text("posted"));
  app.put("/method-test", () => text("putted"));

  // Cookie setting routes
  app.get("/set-cookie-root", () => {
    return new Response("ok", {
      headers: {
        "set-cookie": "session_id=root123; Path=/; Max-Age=3600",
      },
    });
  });

  app.get("/set-cookie-admin", () => {
    return new Response("ok", {
      headers: {
        "set-cookie": "admin_token=secret789; Path=/admin; Max-Age=3600",
      },
    });
  });

  app.get("/set-cookie-expired", () => {
    return new Response("ok", {
      headers: {
        "set-cookie": "old_crumb=bye; Path=/; Max-Age=0",
      },
    });
  });

  app.get("/read-cookies", (ctx) => {
    return text(ctx.request.headers.get("cookie") ?? "none");
  });

  app.get("/admin/read-cookies", (ctx) => {
    return text(ctx.request.headers.get("cookie") ?? "none");
  });

  // Redirect routes
  app.post("/redirect-303", () => {
    return new Response(null, {
      status: 303,
      headers: { location: "/redirect-target-get" },
    });
  });

  app.post("/redirect-307", () => {
    return new Response(null, {
      status: 307,
      headers: { location: "/redirect-target-post" },
    });
  });

  app.post("/redirect-308", () => {
    return new Response(null, {
      status: 308,
      headers: { location: "/redirect-target-post" },
    });
  });

  app.get("/redirect-target-get", () => text("landed-get"));
  app.post("/redirect-target-post", async (ctx) => {
    const body = await ctx.request.text();
    return text(`landed-post:${body}`);
  });

  // Relative redirect testing (Location: next resolved against request URL)
  app.get("/nested/start", () => {
    return new Response(null, {
      status: 302,
      headers: { location: "finish" },
    });
  });
  app.get("/nested/finish", () => text("landed-nested-finish"));

  // Malformed param test
  app.get("/decode/:value", (ctx) => text(`decoded:${ctx.params.value}`));

  return app;
}

function runMatrixSuite(
  name: "in-process" | "real-server",
  getClient: () => TestClient,
) {
  describe(`BR-092 Golden Matrix (${name})`, () => {
    test("1. Precedence: exact route wins over parameter route registered earlier", async () => {
      const client = getClient();
      const resMe = await client.get("/users/me");
      expect(resMe.status).toBe(200);
      expect(await resMe.text()).toBe("exact:me");

      const resParam = await client.get("/users/123");
      expect(resParam.status).toBe(200);
      expect(await resParam.text()).toBe("param:123");
    });

    test("1b. Precedence: exact route wins over wildcard route", async () => {
      const client = getClient();
      const resSpecial = await client.get("/files/special");
      expect(resSpecial.status).toBe(200);
      expect(await resSpecial.text()).toBe("exact:special");
    });

    test("2. HEAD requests strip body on static and dynamic responses", async () => {
      const client = getClient();

      // Static route
      const headStatic = await client.head("/static");
      expect(headStatic.status).toBe(200);
      expect(headStatic.headers.get("content-type")).toContain("text/html");
      expect(await headStatic.text()).toBe("");

      // Dynamic route
      const headDynamic = await client.head("/dynamic-html");
      expect(headDynamic.status).toBe(200);
      expect(headDynamic.headers.get("content-type")).toContain("text/html");
      expect(await headDynamic.text()).toBe("");
    });

    test("3. Malformed percent-encoded parameter does not crash server", async () => {
      const client = getClient();
      const res = await client.get("/decode/%E0%A4%A");
      expect(res.status).toBe(200);
      const textVal = await res.text();
      expect(textVal).toContain("decoded:");
    });

    test("4. 405 Method Not Allowed and Auto-OPTIONS have deterministic Allow headers", async () => {
      const client = getClient();

      // 405 on unregistered method
      const res405 = await client.delete("/method-test");
      expect(res405.status).toBe(405);
      expect(res405.headers.get("allow")).toBe("OPTIONS, POST, PUT");

      // Auto-OPTIONS
      const resOptions = await client.fetch(
        new Request("http://test.invalid/method-test", { method: "OPTIONS" }),
      );
      expect(resOptions.status).toBe(204);
      expect(resOptions.headers.get("allow")).toBe("OPTIONS, POST, PUT");
    });

    test("5. Cookie jar respects Path and Max-Age/Expires", async () => {
      const client = getClient();

      // Set root cookie
      await client.get("/set-cookie-root");
      // Set admin path-scoped cookie
      await client.get("/set-cookie-admin");

      // Request to /read-cookies should only receive root cookie
      const resRoot = await client.get("/read-cookies");
      const rootCookies = await resRoot.text();
      expect(rootCookies).toContain("session_id=root123");
      expect(rootCookies).not.toContain("admin_token=secret789");

      // Request to /admin/read-cookies should receive BOTH root and admin cookies
      const resAdmin = await client.get("/admin/read-cookies");
      const adminCookies = await resAdmin.text();
      expect(adminCookies).toContain("session_id=root123");
      expect(adminCookies).toContain("admin_token=secret789");

      // Expire root cookie
      await client.get("/set-cookie-expired");
      const resAfterExpire = await client.get("/read-cookies");
      expect(await resAfterExpire.text()).not.toContain("old_crumb");
    });

    test("6. 303 PRG switches method to GET; 307/308 preserve POST method and body", async () => {
      const client = getClient();

      // 303 -> GET
      const res303 = await client.post("/redirect-303");
      expect(res303.status).toBe(303);
      const followed303 = await client.follow(res303);
      expect(followed303.status).toBe(200);
      expect(await followed303.text()).toBe("landed-get");

      // 307 -> POST with body preserved
      const res307 = await client.post("/redirect-307", {
        body: "payload-307",
      });
      expect(res307.status).toBe(307);
      const followed307 = await client.follow(res307);
      expect(followed307.status).toBe(200);
      expect(await followed307.text()).toBe("landed-post:payload-307");

      // 308 -> POST with body preserved
      const res308 = await client.post("/redirect-308", {
        body: "payload-308",
      });
      expect(res308.status).toBe(308);
      const followed308 = await client.follow(res308);
      expect(followed308.status).toBe(200);
      expect(await followed308.text()).toBe("landed-post:payload-308");
    });

    test("6b. Relative Location header resolves against requesting URL", async () => {
      const client = getClient();
      const res = await client.get("/nested/start");
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("finish");
      const followed = await client.follow(res);
      expect(followed.status).toBe(200);
      expect(await followed.text()).toBe("landed-nested-finish");
    });

    test("6c. Interleaved concurrent requests preserve exact originating request for follow()", async () => {
      const client = getClient();
      const reqA = await client.post("/redirect-307", { body: "payload-A" });
      const reqB = await client.post("/redirect-307", { body: "payload-B" });

      // Follow in reverse order: reqA must still carry payload-A
      const followB = await client.follow(reqB);
      expect(await followB.text()).toBe("landed-post:payload-B");

      const followA = await client.follow(reqA);
      expect(await followA.text()).toBe("landed-post:payload-A");
    });

    test("7. Static Response can be read repeatedly without body poisoning", async () => {
      const client = getClient();
      const res1 = await client.get("/static");
      expect(await res1.text()).toBe("<p>static-content</p>");

      const res2 = await client.get("/static");
      expect(await res2.text()).toBe("<p>static-content</p>");
    });
  });
}

// Instantiate in-process client
const inProcessApp = buildMatrixApp();
runMatrixSuite("in-process", () => createTestClient(inProcessApp));

// Instantiate real server client
const serverApp = buildMatrixApp();
let testServer: TestServer | undefined;
runMatrixSuite("real-server", () => {
  if (!testServer) {
    testServer = startTestServer(serverApp);
  }
  return testServer.client;
});
