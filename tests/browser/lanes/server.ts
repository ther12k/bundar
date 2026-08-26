/**
 * BR-075 lane server: boots the REAL reference applications (Todo and
 * Admin CRUD example apps, unmodified) with the pinned htmx2 asset wired
 * in, and serves axe-core for the accessibility lane.
 *
 * The examples' layouts reference `/assets/htmx.js` while leaving asset
 * serving to the deployment; this server provides that route so browser
 * lanes exercise complete documents. Everything else delegates to the
 * apps' compiled route tables.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHtmxAssetHandler } from "@bundar/htmx";
import { htmx2 } from "@bundar/htmx/2";
import type { CompiledServerOptions } from "@bundar/core";
import { createTodoApp } from "../../../examples/todo/src/app";
import { createInMemoryTodoRepository } from "../../../examples/todo/src/features/todos/todos.repository";
import { createAdminApp } from "../../../examples/admin-crud/src/app";
import { createInMemoryArticleRepository } from "../../../examples/admin-crud/src/features/articles/articles.repository";

const repositoryRoot = join(import.meta.dir, "..", "..", "..");
const assetHandler = createHtmxAssetHandler({ dialect: htmx2 });
let axeSource: string | null = null;

async function serveAxe(): Promise<Response> {
  if (axeSource === null) {
    axeSource = await readFile(
      join(repositoryRoot, "node_modules", "axe-core", "axe.min.js"),
      "utf8",
    );
  }
  return new Response(axeSource, {
    headers: { "content-type": "application/javascript; charset=utf-8" },
  });
}

export interface LaneServer {
  readonly todo: { readonly port: number };
  readonly admin: { readonly port: number };
  stop(): void;
}

export async function startLaneServer(): Promise<LaneServer> {
  const todo = createTodoApp({
    repository: createInMemoryTodoRepository({
      seed: ["Write the walkthrough", "Verify both browser modes"],
    }),
  });
  const admin = createAdminApp({
    repository: createInMemoryArticleRepository([
      {
        title: "Alpha announcement",
        slug: "alpha-announcement",
        status: "published",
      },
      { title: "Beta notes", slug: "beta-notes", status: "draft" },
      {
        title: "Migration guide",
        slug: "migration-guide",
        status: "published",
      },
      {
        title: "Security overview",
        slug: "security-overview",
        status: "published",
      },
      { title: "Roadmap update", slug: "roadmap-update", status: "draft" },
      {
        title: "Release checklist",
        slug: "release-checklist",
        status: "draft",
      },
      {
        title: "Fixture article seven",
        slug: "fixture-seven",
        status: "published",
      },
    ]),
  });

  const serveApp = (
    compiled: CompiledServerOptions,
  ): ReturnType<typeof Bun.serve> => {
    const appFetch = compiled.fetch.bind(compiled);
    return Bun.serve({
      ...compiled,
      fetch: async (request: Request): Promise<Response> => {
        const path = new URL(request.url).pathname;
        if (path === "/assets/htmx.js") return assetHandler(request);
        if (path === "/__bundar/axe.js") return serveAxe();
        return await appFetch(request);
      },
      port: 0,
    });
  };

  const todoServer = serveApp(todo.app.compile());
  const adminServer = serveApp(admin.app.compile());

  // Bun types server.port as number | undefined (unix sockets); these
  // servers always bind TCP via port: 0, so a fallback is unreachable.
  const todoPort = todoServer.port ?? 0;
  const adminPort = adminServer.port ?? 0;

  return {
    todo: { port: todoPort },
    admin: { port: adminPort },
    stop(): void {
      todoServer.stop(true);
      adminServer.stop(true);
    },
  };
}
