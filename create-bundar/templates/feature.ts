/**
 * Feature-sliced starter template (BR-024/BR-025).
 *
 * Same application behavior as the compact minimal template — health route,
 * home page, progressive subscribe form — organized per ADR-0019:
 *
 *   src/app.ts                        composition only
 *   src/platform/dialect.ts           the one dialect decision
 *   src/features/subscribe/*.routes   HTTP/HTMX orchestration
 *   src/features/subscribe/*.schema   input contract
 *   src/features/subscribe/*.actions  business use case (HTTP-free)
 *   src/features/subscribe/*.view     page + fragment rendering
 *
 * The generated tree passes `bun run app:arch` in feature-sliced mode.
 */
import {
  dialectModule,
  EXPERIMENTAL_BANNER,
  type TemplateContext,
  type TemplateFile,
} from "./shared";

export interface FeatureTemplate {
  readonly files: Readonly<Record<string, TemplateFile>>;
}

const SHARED_TS_CONFIG = () =>
  JSON.stringify(
    {
      compilerOptions: {
        target: "ESNext",
        lib: ["ESNext"],
        module: "ESNext",
        moduleResolution: "bundler",
        strict: true,
        jsx: "react-jsx",
        jsxImportSource: "@bundar/jsx",
        types: ["bun"],
        noEmit: true,
      },
      include: ["src/**/*.ts", "src/**/*.tsx"],
    },
    null,
    2,
  ) + "\n";

const PKG_JSON = (context: TemplateContext) =>
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
        "app:arch": "bun tools/app-architecture/check.ts .",
      },
      dependencies: {
        "@bundar/core": "workspace:*",
        "@bundar/forms": "workspace:*",
        "@bundar/htmx": "workspace:*",
        "@bundar/jsx": "workspace:*",
        "@bundar/schema": "workspace:*",
      },
      devDependencies: {
        "@types/bun": "1.3.14",
        typescript: "6.0.3",
      },
    },
    null,
    2,
  ) + "\n";

export const featureTemplate: FeatureTemplate = {
  files: {
    "package.json": PKG_JSON,
    "tsconfig.json": SHARED_TS_CONFIG,
    ".gitignore": () => `node_modules/\ndist/\n`,

    "README.md": (context) => `# ${context.name}

A [Bundar](https://github.com/ther12k/bundar) application using the
feature-sliced structure ([ADR-0019](https://github.com/ther12k/bundar/blob/main/decisions/0019-agent-friendly-feature-slices.md)).

\`\`\`bash
bun install
bun run dev
\`\`\`

Layout: \`src/features/subscribe/*\` owns the subscribe workflow; dependency
direction is routes → actions → ports, views → read models. Boundary
checking: \`bun run app:arch\`.
`,

    "src/platform/dialect.ts": dialectModule,

    "src/features/subscribe/AGENTS.md": () => `# subscribe slice — agent map

Purpose: progressive email-subscribe form; one handler set for no-JS PRG and htmx fragments.
Public entrypoint: subscribe.routes.tsx (\`registerSubscribeRoutes\`). Contracts: route names \`home\`, \`subscribe\`; DOM ids \`subscribe-form\`, \`email-error\`, \`subscribed\`.

Allowed imports: routes → schema/types/view (+ framework); view → types only.
Read zones: this directory + src/layout.tsx. Write zones: this directory.

Checks:
- bun run typecheck && bun test
- bun run app:arch .

Escalate when: validation semantics change or typed URLs must be regenerated.

Details: see ADR-0019 in the Bundar repository.
`,

    "src/features/subscribe/subscribe.types.ts": () =>
      `/**
 * Domain + read models for the subscribe feature.
 */
export type SubscribeResult =
  | { readonly ok: true; readonly email: string }
  | { readonly ok: false; readonly reason: string };
`,

    "src/features/subscribe/subscribe.schema.ts": () =>
      `/**
 * Input validation contract (GH-058 style): plain structural check here;
 * swap in any Standard Schema validator when the form grows.
 */
import type { SubscribeResult } from "./subscribe.types";

export function parseSubscribeInput(
  raw: unknown,
): SubscribeResult {
  const email = String(
    (raw as Record<string, unknown> | null)?.["email"] ?? "",
  )
    .trim()
    .slice(0, 200);
  if (!email.includes("@") || email.length < 3) {
    return { ok: false, reason: "Enter a valid email address" };
  }
  return { ok: true, email };
}
`,

    "src/features/subscribe/subscribe.actions.ts": () =>
      `/**
 * Business use cases — no HTTP types, no JSX, no HTMX (ADR-0019 policy).
 */
import type { SubscribeResult } from "./subscribe.types";

/** Persists a subscription; replace the body with real storage later. */
export async function subscribe(email: string): Promise<SubscribeResult> {
  return { ok: true, email };
}
`,

    "src/features/subscribe/subscribe.view.tsx": () =>
      `/**
 * Pages and fragments for the subscribe feature. Views render typed data;
 * they never call actions or touch protocol code.
 */
import { jsx } from "@bundar/jsx";
import { Layout } from "../../layout";

export function homeContent(): unknown {
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

export function homeFragment(): unknown {
  // fragments skip the layout's <html> skeleton by definition
  return jsx("section", { id: "home", children: homeContent() });
}

export function homePage(): unknown {
  return Layout({ title: "Home", children: homeContent() });
}

export function subscribedFragment(email: string): unknown {
  return jsx("p", { id: "subscribed", children: "Subscribed: " + email });
}
`,

    "src/features/subscribe/subscribe.routes.ts": (context) =>
      `/**${EXPERIMENTAL_BANNER(context)}
 * HTTP and hypermedia orchestration for the subscribe feature: parse →
 * validate → invalid error views / valid action response. The same
 * handlers serve ordinary (Post/Redirect/Get) and enhanced (fragment)
 * submissions.
 */
import { parseForm } from "@bundar/core";
import { jsx } from "@bundar/jsx";
import { action, actionResponse, errorViewResponse, view } from "@bundar/htmx";
import { dialect } from "../../platform/dialect";
import { Layout } from "../../layout";
import { parseSubscribeInput } from "./subscribe.schema";
import { homeFragment, homePage, subscribedFragment } from "./subscribe.view";

type App = import("@bundar/core").App;

export function registerSubscribeRoutes(app: App): void {
  app.get(
    "/",
    (context) =>
      view(
        context.request,
        {
          fragment: () => homeFragment(),
          layout: () => homePage(),
        },
        { dialect },
      ),
    { name: "home" },
  );

  // Progressive form: identical validation for both worlds.
  app.post("/subscribe", async (context) => {
    const form = await parseForm(context);
    const parsed = parseSubscribeInput({ email: form.get("email") });
    if (!parsed.ok) {
      return errorViewResponse(
        context.request,
        {
          status: 422,
          code: "unprocessable",
          message: parsed.reason,
        },
        {
          renderDocument: (errorView) =>
            Layout({
              title: "Invalid email",
              children: jsx("h1", { children: errorView.message }),
            }),
          renderFragment: (errorView) =>
            jsx("p", { id: "form-error", children: errorView.message }),
        },
        { dialect },
      );
    }
    return actionResponse(
      context.request,
      action({
        fragment: subscribedFragment(parsed.email),
        redirectTo: "/?subscribed=1",
      }),
      { dialect },
    );
  });
}
`,

    "src/layout.tsx": () => `import { document, jsx } from "@bundar/jsx";

/** The one layout: full documents for ordinary navigation; fragments skip it. */
export function Layout(options: {
  title: string;
  children: unknown;
}): unknown {
  return document({
    title: options.title,
    lang: "en",
    children: jsx("body", { children: options.children }),
  });
}
`,

    "src/app.ts": (context) => `/**${EXPERIMENTAL_BANNER(context)}
 * Application composition ONLY: wire feature routes onto one App.
 * Per ADR-0019 this file must not accumulate handler logic.
 */
import { App, text } from "@bundar/core";
import { createHtmxAssetHandler } from "@bundar/htmx";
import { dialect } from "./platform/dialect";
import { registerSubscribeRoutes } from "./features/subscribe/subscribe.routes";

export function createApp(): App {
  const app = new App();
  const assets = createHtmxAssetHandler({ dialect });

  app.get("/assets/htmx.js", (context) => assets(context.request));
  app.get(
    "/healthz",
    () => text("ok", { headers: { "cache-control": "no-store" } }),
    { name: "health" },
  );
  registerSubscribeRoutes(app);

  return app;
}

export default createApp();
`,

    "src/main.ts": (context) => `/**${EXPERIMENTAL_BANNER(context)}
 * Bootstrap: the application owns its error boundary. Development uses
 * \`bun run dev\` (bun --hot); production runs the built entry directly.
 */
import { ErrorBoundary } from "@bundar/core";
import { createApp } from "./app";
import { dialect } from "./platform/dialect";

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

    "src/features/subscribe/subscribe.test.ts": (
      context,
    ) => `/**${EXPERIMENTAL_BANNER(context)}
 * Slice tests: schema contract + actions purity. Route behavior is covered
 * by integration journeys; keep these focused so agents can run them fast.
 */
import { describe, expect, test } from "bun:test";
import { parseSubscribeInput } from "./subscribe.schema";
import { subscribe } from "./subscribe.actions";

describe("subscribe slice", () => {
  test("schema rejects malformed input with a safe message", () => {
    const result = parseSubscribeInput({ email: "nope" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/valid email/i);
  });

  test("action returns the normalized success result", async () => {
    const result = await subscribe("ada@example.com");
    expect(result).toEqual({ ok: true, email: "ada@example.com" });
  });
});
`,
  },
};
