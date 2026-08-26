/**
 * BR-095 (#147): typed-route code-generation hardening — duplicate path
 * parameter names are rejected at registration/normalization; wildcard
 * routes cannot carry meta.name (the typed builder cannot fill a splat);
 * generated sources survive hostile route names via JSON-encoded string
 * literals (round-trip compile).
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { App, buildRouteManifest, generateRoutesModule } from "../../src/index";
import {
  normalizeRoutePath,
  RoutePathValidationError,
} from "../../src/routing/path";
import { RouteConflictError } from "../../src/routing/conflicts";

describe("BR-095 duplicate parameter names", () => {
  test("normalizeRoutePath rejects /users/:id/posts/:id with a clear error", () => {
    try {
      normalizeRoutePath("/users/:id/posts/:id");
      throw new Error("expected rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(RoutePathValidationError);
      expect(String((error as Error).message)).toContain("duplicate");
    }
  });

  test("three-way duplicates are equally rejected", () => {
    expect(() => normalizeRoutePath("/x/:a/:b/:a")).toThrow(
      RoutePathValidationError,
    );
  });

  test("duplicate params surface as RoutePathValidationError at compile", () => {
    const app = new App();
    app.get("/users/:id/posts/:id", () => new Response("dup"));
    expect(() => app.compile()).toThrow(RoutePathValidationError);
  });
});

describe("BR-095 named wildcard routes", () => {
  test("/files/* with meta.name throws at compile with guidance", () => {
    const app = new App();
    app.route("/files/*", ["GET"], () => new Response("file"), {
      name: "file-download",
    });
    try {
      app.compile();
      throw new Error("expected compile rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(RouteConflictError);
      expect((error as Error).message).toContain(
        "wildcard routes cannot carry meta.name",
      );
    }
  });

  test("unnamed wildcards remain registrable", () => {
    const app = new App();
    app.get("/assets/*", () => new Response("asset"));
    expect(() => app.compile()).not.toThrow();
  });
});

describe("BR-095 generated source survives hostile route names", () => {
  // Backtick, newline, ${}, and quote injection attempts in the
  // developer-controlled route name.
  const HOSTILE = 'bad`name${1 + 1}\nline"quote';

  test("generated module round-trips: compiles, exports callable urls, escapes messages", async () => {
    const app = new App();
    app.get("/orders/:orderId", () => new Response("order"), { name: HOSTILE });
    const manifest = buildRouteManifest(app.manifest());
    const source = generateRoutesModule(manifest);

    // The hostile name must appear ONLY inside safely JSON-encoded string
    // literals — never breaking out of one (no raw backticks/newlines
    // outside literals would be hard to detect syntactically, so prove it
    // functionally: write and IMPORT the module like the consumer fixture).
    const genFile = join(
      import.meta.dir,
      `codegen-hardening-${Date.now()}-${Math.random().toString(36).slice(2)}.ts`,
    );
    await Bun.write(genFile, source);
    const generated = (await import(genFile)) as {
      urls: Record<string, (params?: unknown) => string>;
    };

    const urlKey = Object.keys(generated.urls)[0]!;
    expect(urlKey).toBe(HOSTILE);
    expect(typeof generated.urls[urlKey]).toBe("function");
    expect(generated.urls[urlKey]!({ orderId: "42" })).toBe("/orders/42");

    // Missing-parameter error message is assembled at RUNTIME from the
    // injected name variable — the thrown message still renders the
    // hostile key through the escaped literal prefix.
    let thrown: unknown;
    try {
      generated.urls[urlKey]!({});
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toContain(
      "missing required path parameter",
    );

    await Bun.write(genFile, "");
    const { unlink } = await import("node:fs/promises");
    await unlink(genFile).catch(() => {});
  });

  test("consumer-style end-to-end URL generation still works for tame names", () => {
    const app = new App();
    app.get("/tame/:thing", () => new Response("ok"), { name: "tame" });
    const source = generateRoutesModule(buildRouteManifest(app.manifest()));
    expect(source).toContain('"tame"');
    expect(source).toContain('"/tame/:thing"');
  });
});
