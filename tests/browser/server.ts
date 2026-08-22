import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { view } from "@bundar/htmx";
import { document, jsx } from "@bundar/jsx";

const repositoryRoot = join(import.meta.dir, "..", "..");
const fixtureRoot = join(repositoryRoot, "fixtures", "cross-dialect-app");

export type BrowserLane = "htmx2" | "htmx4";

const versions: Record<BrowserLane, string> = {
  htmx2: "2.0.10",
  htmx4: "4.0.0-beta6",
};

function html(body: string, headers?: Record<string, string>): Response {
  return new Response(body, {
    headers: { "content-type": "text/html; charset=utf-8", ...headers },
  });
}

function fragment(body: string): Response {
  return html(body, { "x-bundar-fixture": "fragment", vary: "HX-Request" });
}

export function fixtureVersion(lane: BrowserLane): string {
  return versions[lane];
}

export async function handler(
  request: Request,
  lane: BrowserLane,
): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/") {
    const source = await readFile(join(fixtureRoot, "index.html"), "utf8");
    return html(source.replace("/assets/htmx.min.js", "/assets/htmx.min.js"));
  }
  if (url.pathname === "/assets/htmx.min.js") {
    const asset = await readFile(
      join(repositoryRoot, "fixtures", lane, "htmx.min.js"),
    );
    return new Response(asset, {
      headers: { "content-type": "application/javascript" },
    });
  }
  if (url.pathname === "/fragment") {
    return fragment('<strong id="fragment">fragment-loaded</strong>');
  }
  if (url.pathname === "/echo" && request.method === "POST") {
    const form = await request.formData();
    return fragment(
      `<strong id="echo">hello-${String(form.get("name") ?? "")}</strong>`,
    );
  }
  if (url.pathname === "/history-target") {
    return fragment('<strong id="history">history-loaded</strong>');
  }
  if (url.pathname === "/page-fragment") {
    // GH-048: one route, two representations, negotiated from normalized
    // metadata — the handler never reads a raw HTMX header.
    return view(request, {
      fragment: () =>
        jsx("section", {
          id: "items",
          children: [
            jsx("h2", { children: "Items" }),
            jsx("p", { children: "42 items available" }),
          ],
        }),
      layout: (content) =>
        document({
          lang: "en",
          title: "Items",
          children: jsx("body", { children: content }),
        }),
    });
  }
  if (url.pathname === "/incorrect-header") {
    return new Response("wrong-header", {
      headers: { "content-type": "text/html", "hx-trigger": "fixture-event" },
    });
  }
  if (url.pathname === "/favicon.ico") {
    return new Response(null, { status: 204 });
  }
  return new Response(`not-found:${lane}`, { status: 404 });
}

export async function startFixtureServer(
  lane: BrowserLane,
): Promise<ReturnType<typeof Bun.serve>> {
  return Bun.serve({
    port: 0,
    fetch: (request) => handler(request, lane),
  });
}
