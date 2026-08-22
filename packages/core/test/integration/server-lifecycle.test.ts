import { describe, expect, test } from "bun:test";
import { App } from "../../src/app";

/**
 * GH-022 server lifecycle: explicit ownership, stop semantics, and no
 * resource leaks. Every test creates AND stops its own server.
 */
describe("GH-022 server lifecycle", () => {
  test("serve returns an owning Bun server on an ephemeral port", () => {
    const app = new App();
    app.get("/x", () => new Response("x"));
    const server = app.serve({ port: 0 });
    expect(typeof server.port).toBe("number");
    expect(server.port).toBeGreaterThan(0);
    server.stop(true);
  });

  test("stopped servers refuse new connections (no zombie listeners)", async () => {
    const app = new App();
    app.get("/x", () => new Response("x"));
    const server = app.serve({ port: 0 });
    const port = server.port!;
    const before = await fetch(`http://localhost:${port}/x`);
    expect(before.status).toBe(200);

    server.stop(true);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expect(fetch(`http://localhost:${port}/x`)).rejects.toThrow();
  });

  test("many servers start and stop cleanly in sequence", async () => {
    const ports: number[] = [];
    for (let i = 0; i < 10; i++) {
      const app = new App();
      app.get(`/n/${i}`, () => new Response(`n${i}`));
      const server = app.serve({ port: 0 });
      ports.push(server.port!);
      const response = await fetch(`http://localhost:${server.port!}/n/${i}`);
      expect(await response.text()).toBe(`n${i}`);
      server.stop(true);
    }
    // all stopped: none accept connections
    await new Promise((resolve) => setTimeout(resolve, 50));
    for (const port of ports) {
      await expect(fetch(`http://localhost:${port}/n/0`)).rejects.toThrow();
    }
  });

  test("graceful stop in-flight: stop(true) closes after current requests", async () => {
    const app = new App();
    app.get("/slow", async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return new Response("done");
    });
    const server = app.serve({ port: 0 });
    const pending = fetch(`http://localhost:${server.port}/slow`);
    await new Promise((resolve) => setTimeout(resolve, 10));
    server.stop(); // graceful: waits for in-flight requests
    const response = await pending;
    expect(await response.text()).toBe("done");
  });
});
