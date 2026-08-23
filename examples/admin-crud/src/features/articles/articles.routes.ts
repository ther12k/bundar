/**
 * Admin CRUD reference application (GH-077).
 *
 * Demonstrates the business-application shape: an authenticated fixture
 * with SERVER-SIDE role checks (viewer/editor/admin), an article table
 * with search/filter/pagination, inline create/edit forms with
 * optimistic-concurrency conflicts (409), delete restricted to admins,
 * an audit feed updated out-of-band after every mutation, and page/
 * fragment error negotiation — all from ONE handler set for no-JS and
 * enhanced browsers. Authorization reads ONLY the session; HTMX metadata
 * is never consulted for permission or record identity.
 *
 * Real applications plug a durable session store and a database behind
 * the same repository interface (docs/examples/admin.md).
 */

import { HttpError } from "@bundar/core";
import type { App, Context } from "@bundar/core";
import {
  addFlash,
  consumeFlash,
  csrfMiddleware,
  getSession,
  issueCsrfToken,
  type CsrfSecret,
} from "@bundar/security";
import { jsx, renderToString } from "@bundar/jsx";
import type { JSXChild } from "@bundar/jsx";
import {
  action,
  actionResponse,
  errorViewResponse,
  serializeUpdates,
  view,
  type HtmxDialectAdapter,
  type UpdateIntent,
} from "@bundar/htmx";
import { ArticleConflictError, type ArticleRepository } from "./articles.types";
import {
  Layout,
  articleForm,
  articleRow,
  articleTable,
  auditRegion,
  loginForm,
  tableControls,
} from "./articles.view";
import { ADMIN_ROLE_RANK } from "./articles.authz";
import {
  isEditor,
  parseStatus,
  requireRole,
  roleOf,
} from "./articles.authz";

async function pageToken(secret: CsrfSecret, context: Context) {
  const session = getSession(context);
  return issueCsrfToken(secret, session?.id ?? "");
}

function submittedToken(request: Request): string {
  return (
    request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)bundar\.csrf=([^;]*)/)?.[1] ?? ""
  );
}

function withCookie(response: Response, cookie: string): Response {
  const headers = new Headers(response.headers);
  headers.append("set-cookie", cookie);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export interface ArticleRouteDeps {
  readonly repository: ArticleRepository;
  readonly csrfSecret: CsrfSecret;
  readonly dialect: HtmxDialectAdapter;
  /** CSRF middleware composed at the group boundary (GH-069 contract). */
  readonly csrf: ReturnType<typeof csrfMiddleware>;
}

export function registerArticleRoutes(app: App, deps: ArticleRouteDeps): void {
  const dialect = deps.dialect;
  const repository = deps.repository;
  const csrfSecret = deps.csrfSecret;
  const dialectOptions = { dialect };

  app.group("", (routes) => {
    routes.use(deps.csrf);

    routes.post(
      "/login",
      async (context) => {
        const form = new URLSearchParams(await context.request.clone().text());
        const requested = form.get("user") ?? "";
        if (!(requested in ADMIN_ROLE_RANK)) {
          return errorViewResponse(
            context.request,
            {
              status: 422,
              code: "unprocessable",
              message: "Unknown fixture user",
            },
            {
              renderDocument: (view_) =>
                Layout({
                  title: "Sign in",
                  flash: [],
                  children: jsx("h1", { children: view_.message }),
                }),
              renderFragment: (view_) =>
                jsx("p", { id: "login-error", children: view_.message }),
            },
            dialectOptions,
          );
        }
        const session = getSession(context);
        session?.set("role", requested);
        session?.set("user", requested);
        addFlash(context, "success", `Signed in as ${requested}.`);
        return actionResponse(
          context.request,
          action({
            fragment: jsx("p", {
              id: "login-result",
              children: `Signed in as ${requested}.`,
            }),
            redirectTo: "/articles",
          }),
          dialectOptions,
        );
      },
      { name: "login" },
    );

    // Create — editor+
    routes.post(
      "/articles",
      async (context) => {
        const user = requireRole(context, "editor");
        if (user === null) return forbidden(context);
        const form = new URLSearchParams(await context.request.clone().text());
        const title = (form.get("title") ?? "").trim();
        const slug = (form.get("slug") ?? "").trim().toLowerCase();
        const status = parseStatus(form.get("status"));
        if (
          title.length < 2 ||
          title.length > 200 ||
          !/^[a-z0-9-]{2,80}$/.test(slug) ||
          status === null
        ) {
          return errorViewResponse(
            context.request,
            {
              status: 422,
              code: "unprocessable",
              message: "Invalid title, slug, or status",
            },
            {
              renderDocument: (view_) =>
                Layout({
                  title: "Invalid article",
                  flash: [],
                  user,
                  children: jsx("h1", { children: view_.message }),
                }),
              renderFragment: (view_) =>
                articleForm({
                  action: "/articles",
                  token: submittedToken(context.request),
                  title,
                  slug,
                  status: status ?? "draft",
                  error: view_.message,
                  submitLabel: "Create",
                }),
            },
            dialectOptions,
          );
        }
        const created = repository.create({ title, slug, status, actor: user });
        addFlash(context, "success", `Created “${created.title}”.`);
        return mutationResponse(context, created);
      },
      { name: "article-create" },
    );

    // Edit — editor+; stale version → 409 conflict
    routes.post(
      "/articles/:id/edit",
      async (context) => {
        const user = requireRole(context, "editor");
        if (user === null) return forbidden(context);
        const id = Number(context.params["id"]);
        const existing = repository.get(id);
        if (existing === undefined) return notFound(context, user);
        const form = new URLSearchParams(await context.request.clone().text());
        const title = (form.get("title") ?? "").trim();
        const status = parseStatus(form.get("status"));
        const expectedVersion = Number(form.get("version"));
        if (
          title.length < 2 ||
          title.length > 200 ||
          status === null ||
          !Number.isInteger(expectedVersion)
        ) {
          return errorViewResponse(
            context.request,
            {
              status: 422,
              code: "unprocessable",
              message: "Invalid title or status",
            },
            {
              renderDocument: (view_) =>
                Layout({
                  title: "Invalid article",
                  flash: [],
                  user,
                  children: jsx("h1", { children: view_.message }),
                }),
              renderFragment: (view_) =>
                articleForm({
                  action: `/articles/${id}/edit`,
                  token: submittedToken(context.request),
                  title,
                  slug: existing.slug,
                  status: status ?? existing.status,
                  version: existing.version,
                  error: view_.message,
                  submitLabel: "Save",
                }),
            },
            dialectOptions,
          );
        }
        try {
          const updated = repository.update(id, {
            title,
            status,
            actor: user,
            expectedVersion,
          });
          if (updated === undefined) return notFound(context, user);
          addFlash(
            context,
            "success",
            `Saved “${updated.title}” (v${updated.version}).`,
          );
          return mutationResponse(context, updated);
        } catch (error) {
          if (error instanceof ArticleConflictError) {
            return errorViewResponse(
              context.request,
              {
                status: 409,
                code: "conflict",
                message: "Someone else changed this article — reload and retry",
              },
              {
                renderDocument: (view_) =>
                  Layout({
                    title: "Conflict",
                    flash: [],
                    user,
                    children: jsx("h1", { children: view_.message }),
                  }),
                renderFragment: (view_) =>
                  jsx("p", {
                    id: "form-error",
                    role: "alert",
                    children: view_.message,
                  }),
              },
              dialectOptions,
            );
          }
          throw error;
        }
      },
      { name: "article-edit" },
    );

    // Delete — admin only
    routes.post(
      "/articles/:id/delete",
      (context) => {
        const user = requireRole(context, "admin");
        if (user === null) return forbidden(context);
        const id = Number(context.params["id"]);
        const existing = repository.get(id);
        if (existing === undefined || !repository.remove(id, { actor: user })) {
          return notFound(context, user);
        }
        addFlash(context, "info", `Deleted “${existing.title}”.`);
        // multi-region: remove the row AND refresh the audit feed (OOB)
        const intents: UpdateIntent[] = [
          { target: { id: `article-${id}` }, operation: { kind: "remove" } },
          {
            target: { id: "audit-region" },
            operation: { kind: "replace-element" },
            content: auditRegion(repository.audit(8)) as JSXChild,
          },
        ];
        return actionResponse(
          context.request,
          action({
            fragment: serializeUpdates(intents, dialect).html,
            redirectTo: "/articles",
          }),
          dialectOptions,
        );
      },
      { name: "article-delete" },
    );
  });

  // Pages
  const forbidden = (context: Context) =>
    errorViewResponse(
      context.request,
      {
        status: 403,
        code: "forbidden",
        message: "Insufficient role for this action",
      },
      {
        renderDocument: (view_) =>
          Layout({
            title: "Forbidden",
            flash: [],
            children: jsx("h1", { children: view_.message }),
          }),
        // auth failures never leak protected fragments (GH-065 default)
      },
      dialectOptions,
    );

  const notFound = (context: Context, user: string | null) =>
    errorViewResponse(
      context.request,
      { status: 404, code: "not_found", message: "Article not found" },
      {
        renderDocument: (view_) =>
          Layout({
            title: "Not found",
            flash: [],
            ...(user !== null ? { user } : {}),
            children: jsx("h1", { children: view_.message }),
          }),
        renderFragment: (view_) =>
          jsx("p", { id: "article-error", children: view_.message }),
      },
      dialectOptions,
    );

  app.get(
    "/login",
    async (context) => {
      const token = await pageToken(csrfSecret, context);
      const response = await view(
        context.request,
        {
          fragment: () => loginForm({ token: token.token, error: "" }),
          layout: (content) =>
            Layout({ title: "Sign in", flash: [], children: content }),
        },
        dialectOptions,
      );
      return withCookie(response, csrfCookie(token.token, token.expiresAtMs));
    },
    { name: "login-page" },
  );

  app.get(
    "/",
    () =>
      new Response(null, { status: 303, headers: { location: "/articles" } }),
    {
      name: "root",
    },
  );

  app.get(
    "/articles",
    async (context) => {
      const user = requireRole(context, "viewer");
      if (user === null) return unauthenticated(context);
      const url = new URL(context.request.url);
      const search = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
      const statusParam = url.searchParams.get("status");
      const page = Number(url.searchParams.get("page") ?? "1");
      const flashes = consumeFlash(context);
      const token = await pageToken(csrfSecret, context);
      const role = roleOf(context);
      const canDelete = role === "admin";
      const result = repository.query({
        ...(search.length > 0 ? { search } : {}),
        ...(statusParam === "draft" || statusParam === "published"
          ? { status: statusParam }
          : {}),
        page: Number.isInteger(page) && page > 0 ? page : 1,
      });

      const content = [
        tableControls({ search, status: statusParam ?? "", page: result }),
        articleTable({ page: result, token: token.token, canDelete }),
        auditRegion(repository.audit(8)),
        jsx("div", {
          id: "form-region",
          children: isEditor(role)
            ? articleForm({
                action: "/articles",
                token: token.token,
                title: "",
                slug: "",
                status: "draft",
                error: "",
                submitLabel: "Create",
              })
            : jsx("p", {
                id: "form-region",
                children: "Viewers cannot create articles.",
              }),
        }),
      ];

      const response = await view(
        context.request,
        {
          fragment: () =>
            jsx("section", { id: "admin-region", children: content }),
          layout: (inner) =>
            Layout({
              title: "Articles",
              flash: flashes,
              user,
              children: inner,
            }),
        },
        dialectOptions,
      );
      return withCookie(response, csrfCookie(token.token, token.expiresAtMs));
    },
    { name: "article-list" },
  );

  app.get(
    "/articles/:id",
    async (context) => {
      const user = requireRole(context, "viewer");
      if (user === null) return unauthenticated(context);
      const article = repository.get(Number(context.params["id"]));
      if (article === undefined) return notFound(context, user);
      const flashes = consumeFlash(context);
      const token = await pageToken(csrfSecret, context);
      const role = roleOf(context);
      const content = [
        jsx("h2", { children: article.title }),
        jsx("p", {
          children: `${article.slug} · ${article.status} · v${article.version}`,
        }),
        jsx("div", {
          id: "form-region",
          children: isEditor(role)
            ? articleForm({
                action: `/articles/${article.id}/edit`,
                token: token.token,
                title: article.title,
                slug: article.slug,
                status: article.status,
                version: article.version,
                error: "",
                submitLabel: "Save",
              })
            : jsx("p", {
                id: "form-region",
                children: "Viewers cannot edit articles.",
              }),
        }),
        auditRegion(repository.audit(8)),
      ];
      const response = await view(
        context.request,
        {
          fragment: () =>
            jsx("section", { id: "detail-region", children: content }),
          layout: (inner) =>
            Layout({
              title: article.title,
              flash: flashes,
              user,
              children: inner,
            }),
        },
        dialectOptions,
      );
      return withCookie(response, csrfCookie(token.token, token.expiresAtMs));
    },
    { name: "article-detail" },
  );

  const unauthenticated = (context: Context) =>
    errorViewResponse(
      context.request,
      { status: 401, code: "unauthorized", message: "Sign in required" },
      {
        renderDocument: () =>
          Layout({
            title: "Sign in required",
            flash: [],
            children: jsx("p", {
              children: jsx("a", {
                href: "/login",
                children: "Go to the login page",
              }),
            }),
          }),
      },
      dialectOptions,
    );

  /**
   * Success response for create/edit: the updated row + refreshed audit
   * feed as normalized OOB intents (multi-region update).
   */
  function mutationResponse(
    context: Context,
    article: { id: number },
  ): Promise<Response> {
    void context;
    const updated = repository.get(article.id);
    if (updated === undefined) {
      return Promise.reject(new HttpError("not_found", "Article not found"));
    }
    const row = articleRow({ article: updated, token: "", canDelete: true });
    const markup =
      renderToString(jsx("tbody", { children: row })) +
      serializeUpdates(
        [
          {
            target: { id: "audit-region" },
            operation: { kind: "replace-element" },
            content: auditRegion(repository.audit(8)) as JSXChild,
          },
        ],
        dialect,
      ).html;
    return Promise.resolve(
      actionResponse(
        context.request,
        action({ fragment: markup, redirectTo: "/articles" }),
        dialectOptions,
      ),
    );
  }
}

function csrfCookie(token: string, expiresAtMs: number): string {
  return `bundar.csrf=${token}; Path=/; HttpOnly; SameSite=Strict; Expires=${new Date(expiresAtMs).toUTCString()}`;
}
