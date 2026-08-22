/**
 * GH-074 real-server opt-in coverage: ephemeral-port servers share the
 * client interface with in-process transport, parity of observable
 * behavior, guaranteed teardown (explicit stop, registry stop-all, and
 * withRealServer on failure), and port release after stop.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { App, text } from "@bundar/core";
import {
  createTestClient,
  startTestServer,
  stopAllTestServers,
  withRealServer,
} from "../src/index";

function createParityApp(): App {
  const app = new App();
  app.get("/hello", () => text("hello"));
  app.post("/echo", async (context) => text(await context.request.text()));
  app.get(
    "/moved",
    () => new Response(null, { status: 303, headers: { location: "/hello" } }),
  );
  app.get("/fail", () => {
    throw new Error("boom");
  });
  return app;
}

// suite-level safety net: anything not explicitly stopped dies here
afterAll(() => {
  stopAllTestServers();
});

describe("GH-074 startTestServer — real ephemeral servers", () => {
  test("serves the app over a real port with the same client interface", async () => {
    const server = startTestServer(createParityApp());
    try {
      expect(server.mode).toBe("real-server");
      expect(server.port).toBeGreaterThan(0);
      const response = await server.client.get("/hello");
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("hello");
    } finally {
      server.stop();
    }
  });

  test("POST bodies cross the transport intact", async () => {
    const server = startTestServer(createParityApp());
    try {
      const response = await server.client.fetch(
        new Request(`${server.url}/echo`, {
          method: "POST",
          body: "payload-123",
        }),
      );
      expect(await response.text()).toBe("payload-123");
    } finally {
      server.stop();
    }
  });

  test("redirect chains follow over the transport", async () => {
    const server = startTestServer(createParityApp());
    try {
      const moved = await server.client.get("/moved");
      expect(moved.status).toBe(303);
      const settled = await server.client.follow(moved);
      expect(await settled.text()).toBe("hello");
    } finally {
      server.stop();
    }
  });

  test("observable parity with the in-process client", async () => {
    const app = createParityApp();
    const inProcess = createTestClient(app);
    const server = startTestServer(app);
    try {
      const [a, b] = await Promise.all([
        inProcess.get("/hello").then((r) => [r.status, r.text()] as const),
        server.client.get("/hello").then((r) => [r.status, r.text()] as const),
      ]);
      expect(a).toEqual(b);
    } finally {
      server.stop();
    }
  });

  test("stop() releases the port (a new server binds immediately)", async () => {
    const first = startTestServer(createParityApp());
    const port = first.port;
    first.stop();
    const second = startTestServer(createParityApp(), { port });
    try {
      const response = await second.client.get("/hello");
      expect(await response.text()).toBe("hello");
    } finally {
      second.stop();
    }
  });

  test("stop() is idempotent", () => {
    const server = startTestServer(createParityApp());
    server.stop();
    server.stop();
  });

  test("withRealServer guarantees teardown on failure", async () => {
    let stoppedPort = -1;
    expect(
      withRealServer(createParityApp(), async (server) => {
        stoppedPort = server.port;
        throw new Error("test failure inside the harness");
      }),
    ).rejects.toThrow("test failure inside the harness");
    // the rejected promise already ran the finally: the port is free again
    const rebound = startTestServer(createParityApp(), { port: stoppedPort });
    rebound.stop();
  });

  test("without an app error hook the transports differ visibly (documented)", async () => {
    // Real server: Bun's default opaque 500 (wired explicitly by
    // startTestServer to keep the test runner free of uncaught noise).
    // In-process: the failure REJECTS — tests see the error directly.
    const server = startTestServer(createParityApp());
    try {
      const response = await server.client.get("/fail");
      expect(response.status).toBe(500);
      expect(createTestClient(createParityApp()).get("/fail")).rejects.toThrow(
        "boom",
      );
    } finally {
      server.stop();
    }
  });

  test("with an error hook the real server answers the hook's response", async () => {
    const app = createParityApp();
    const server = startTestServer(
      app.compile({ error: () => text("hook-caught", { status: 500 }) }),
    );
    try {
      const response = await server.client.get("/fail");
      expect(response.status).toBe(500);
      expect(await response.text()).toBe("hook-caught");
    } finally {
      server.stop();
    }
  });
});
