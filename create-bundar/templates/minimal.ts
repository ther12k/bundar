/**
 * create-bundar templates — the minimal application (GH-071).
 *
 * Templates are code, not copied files: each entry renders with the project
 * name and dialect, so a generated project never contains stale paths or
 * the wrong dialect import. The app is secure-by-default (production error
 * posture, bounded parsing, PRG fallback) and runs with JavaScript disabled
 * for the core flow.
 */

import {
  dialectModule,
  EXPERIMENTAL_BANNER,
  type TemplateFile,
} from "./shared";

export interface MinimalTemplate {
  readonly files: Readonly<Record<string, TemplateFile>>;
}

export const minimalTemplate: MinimalTemplate = {
  files: {
    "package.json": (context) =>
      JSON.stringify(
        {
          name: context.name,
          version: "0.0.0",
          private: true,
          type: "module",
          engines: { bun: ">=1.4.0" },
          scripts: {
            dev: "bun --hot src/main.ts",
            start: "bun src/main.ts",
            typecheck: "tsc --noEmit",
            test: "bun test",
            build: "bun build src/main.ts --outdir dist --target=bun",
          },
          dependencies: {
            "@bundar/core": "workspace:*",
            "@bundar/htmx": "workspace:*",
            "@bundar/jsx": "workspace:*",
            "@bundar/schema": "workspace:*",
          },
          devDependencies: {
            "@bundar/testing": "workspace:*",
            "@types/bun": "1.3.14",
            typescript: "6.0.3",
          },
        },
        null,
        2,
      ) + "\n",

    "tsconfig.json": () =>
      JSON.stringify(
        {
          compilerOptions: {
            target: "ESNext",
            lib: ["ESNext"],
            module: "ESNext",
            moduleResolution: "bundler",
            strict: true,
            noEmit: true,
            types: ["bun"],
            jsx: "react-jsx",
            jsxImportSource: "@bundar/jsx",
            skipLibCheck: true,
          },
          include: ["src/**/*.ts", "src/**/*.tsx"],
        },
        null,
        2,
      ) + "\n",

    "src/dialect.ts": dialectModule,

    "src/layout.tsx": () => `import { document, jsx } from "@bundar/jsx";
import { HtmxScript } from "@bundar/htmx";
import { dialect } from "./dialect";

/** One layout for every page: nav, main content, local htmx asset. */
export function Layout({
  title,
  children,
  script = true,
}: {
  title: string;
  children: unknown;
  script?: boolean;
}) {
  // local asset only — no CDN; served from the pinned vendor file.
  // In <head>: HtmxScript ships the dialect error-swap preset as a meta
  // tag that htmx reads at load.
  return document({
    lang: "en",
    title,
    head: script
      ? HtmxScript({ dialect, src: "/assets/htmx.js", integrity: null })
      : null,
    children: [
      jsx("header", {
        children: jsx("nav", {
          children: jsx("a", { href: "/", children: "Home" }),
        }),
      }),
      jsx("main", { children }),
    ],
  });
}
`,

    "src/app.ts": (context) => `/**${EXPERIMENTAL_BANNER(context)}
 * The application: a health route, a home page, and a progressive form
 * that works WITHOUT JavaScript (Post/Redirect/Get) and WITH htmx
 * (fragment swap) — the same handlers serve both worlds.
 */
import { App, text } from "@bundar/core";
import type { StandardSchema } from "@bundar/schema";
import { jsx } from "@bundar/jsx";
import {
  createFormActions,
  createHtmxAssetHandler,
  defineFormAction,
  view,
} from "@bundar/htmx";
import { Layout } from "./layout";
import { dialect } from "./dialect";

export function createApp(): App {
  const app = new App();
  const assets = createHtmxAssetHandler({ dialect });

  // Local htmx asset from the framework's pinned vendor file (no CDN).
  app.get("/assets/htmx.js", (context) => assets(context.request));

  app.get(
    "/healthz",
    () => text("ok", { headers: { "cache-control": "no-store" } }),
    { name: "health" },
  );

  app.get("/", (context) =>
    view(
      context.request,
      {
        fragment: () => homeFragment(),
        layout: (content) => Layout({ title: "Home", children: content }),
      },
      { dialect },
    ),
  );

  // Progressive form: the separated workflow — the dialect is bound once,
  // run() owns the mutation, the success renderer draws only from the
  // result, and invalid rendering reads fields through field(name).
  const forms = createFormActions({ dialect });
  const subscribeSchema: StandardSchema<unknown, { email: string }> = {
    "~standard": {
      version: 1,
      vendor: "bundar.starter",
      validate: (value: unknown) => {
        const record = value as Record<string, unknown>;
        const email = typeof record["email"] === "string" ? record["email"] : "";
        if (email.trim().length < 3 || !email.includes("@")) {
          return {
            issues: [{ message: "Enter a valid email address", path: ["email"] }],
          };
        }
        return { value: { email: email.trim().toLowerCase() } };
      },
    },
  };
  const subscribe = defineFormAction({
    // Standard Schema v1 inline — any conforming validator can replace it
    // without touching routes or views (and with zero extra dependencies).
    schema: subscribeSchema,
    run: ({ email }) => ({ email }),
    success: {
      fragment: ({ email }) =>
        jsx("p", { id: "subscribed", children: "Subscribed: " + email }),
      redirectTo: "/?subscribed=1",
    },
    invalid: {
      fragment: ({ field }) =>
        jsx("p", { id: "form-error", children: field("email").error ?? "" }),
      // the specific validation message travels in the FIELD data now;
      // view_.message is the generic envelope ("Validation failed")
      document: (render, view_) =>
        Layout({
          title: "Invalid email",
          children: jsx("h1", {
            children: render.field("email").error ?? view_.message,
          }),
        }),
      target: "#subscribe-form",
    },
  });
  app.post("/subscribe", forms.handle(subscribe));

  return app;
}

export default createApp();

function homeContent(): unknown {
  return [
    jsx("h1", { children: "Welcome to Bundar" }),
    jsx("p", { children: "A Bun-native, HTML-first framework." }),
    jsx("form", {
      id: "subscribe-form",
      method: "post",
      action: "/subscribe",
      "hx-post": "/subscribe",
      "hx-target": "#subscribe-form",
      children: [
        jsx("input", {
          type: "email",
          name: "email",
          placeholder: "you@example.com",
          required: true,
        }),
        jsx("button", { type: "submit", children: "Subscribe" }),
      ],
    }),
  ];
}

function homeFragment(): unknown {
  // fragments skip the layout's <html> skeleton by definition
  return jsx("section", { id: "home", children: homeContent() });
}
`,

    "src/main.ts": (context) => `/**${EXPERIMENTAL_BANNER(context)}
 * Bootstrap: the application owns its error boundary. Development uses
 * \`bun run dev\` (bun --hot); production runs the built entry directly.
 */
import { ErrorBoundary } from "@bundar/core";
import { createApp } from "./app";
import { dialect } from "./dialect";

const app = createApp();
const boundary = new ErrorBoundary({
  development: process.env.NODE_ENV !== "production",
});
const server = Bun.serve({
  ...app.compile(),
  port: Number(process.env.PORT ?? 3000),
  error: (error: Error) => boundary.capture(error),
});
console.log("bundar app on http://localhost:" + server.port + " (dialect: " + dialect.id + ")");
`,

    "src/app.test.ts": (context) => `/**${EXPERIMENTAL_BANNER(context)}
 * Generated tests: the same application verified in both browser modes
 * with @bundar/testing — no network port needed.
 */
import { describe, expect, test } from "bun:test";
import { createTestClient } from "@bundar/testing";
import { createApp } from "./app";
import { dialect } from "./dialect";

const client = createTestClient(createApp(), { dialect });

describe("generated app", () => {
  test("health endpoint answers", async () => {
    const response = await client.get("/healthz");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });

  test("home page renders a document with the form", async () => {
    const html = await (await client.get("/")).text();
    expect(html).toContain("<html");
    expect(html).toContain('id="subscribe-form"');
  });

  test("form works WITHOUT JavaScript (PRG)", async () => {
    const submitted = await client.submitForm("/subscribe", { email: "nojs@example.com" });
    expect([303, 200]).toContain(submitted.status);
  });

  test("enhanced (htmx) form receives a fragment", async () => {
    const response = await client.enhancedSubmitForm(
      "/subscribe",
      { email: "enhanced@example.com" },
      { target: "#subscribe-form" },
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Subscribed");
  });
});
`,

    "README.md": (context) => `# ${context.name}

Generated by create-bundar${context.dialect === "htmx4-experimental" ? " — **EXPERIMENTAL dialect: htmx 4.0.0-beta6 (beta; no GA compatibility claim)**" : ""}.

## Run

- Development (hot reload): \`bun install && bun run dev\`
- Production: \`bun run build && bun start\`
- Verify: \`bun run typecheck && bun test\`

The subscribe form works with JavaScript disabled (Post/Redirect/Get) and
with htmx (fragment swap) — the same handlers serve both. The htmx asset
is served locally from the framework's pinned vendor file (no CDN).
`,

    ".gitignore": () => `node_modules/\ndist/\n`,
  },
};
