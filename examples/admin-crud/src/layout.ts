/** Shared JSX regions for the Admin CRUD app (GH-077). */
import { document, jsx } from "@bundar/jsx";
import { HtmxScript } from "@bundar/htmx";
import type { Article, ArticlePage, AuditEntry } from "./domain";
import { dialect } from "./dialect";

export function Layout({
  title,
  flash,
  user,
  children,
}: {
  title: string;
  flash: readonly { message: string }[];
  user?: string;
  children: unknown;
}) {
  return document({
    lang: "en",
    title,
    children: [
      jsx("header", {
        children: [
          jsx("h1", { children: "Article admin" }),
          user !== undefined
            ? jsx("p", { id: "whoami", children: `Signed in: ${user}` })
            : null,
        ],
      }),
      jsx("p", {
        id: "flash",
        "aria-live": "polite",
        children: flash.map((f) => f.message).join(" "),
      }),
      jsx("main", { children }),
      HtmxScript({ dialect, src: "/assets/htmx.js", integrity: null }),
    ],
  });
}

/** Search + status filter + pagination controls (plain GET form: no-JS ok). */
export function tableControls(params: {
  search: string;
  status: string;
  page: ArticlePage;
}): unknown {
  const build = (page: number): string => {
    const search = new URLSearchParams();
    if (params.search.length > 0) search.set("q", params.search);
    if (params.status.length > 0) search.set("status", params.status);
    if (page > 1) search.set("page", String(page));
    const text = search.toString();
    return text.length > 0 ? `/articles?${text}` : "/articles";
  };
  return jsx("div", {
    id: "table-controls",
    children: [
      jsx("form", {
        id: "filter-form",
        method: "get",
        action: "/articles",
        children: [
          jsx("input", {
            type: "search",
            name: "q",
            value: params.search,
            placeholder: "Search title or slug",
            "aria-label": "Search articles",
          }),
          jsx("select", {
            name: "status",
            "aria-label": "Filter by status",
            children: [
              jsx("option", { value: "", children: "Any status" }),
              jsx("option", { value: "draft", children: "Draft" }),
              jsx("option", { value: "published", children: "Published" }),
            ],
          }),
          jsx("button", { type: "submit", children: "Filter" }),
        ],
      }),
      jsx("nav", {
        id: "pagination",
        "aria-label": "Pagination",
        children: [
          params.page.page > 1
            ? jsx("a", {
                href: build(params.page.page - 1),
                children: "Previous",
              })
            : null,
          " ",
          jsx("span", {
            id: "page-indicator",
            children: `Page ${params.page.page} of ${params.page.pageCount} (${params.page.total} total)`,
          }),
          " ",
          params.page.page < params.page.pageCount
            ? jsx("a", { href: build(params.page.page + 1), children: "Next" })
            : null,
        ],
      }),
    ],
  });
}

export function articleTable({
  page,
  token,
  canDelete,
}: {
  page: ArticlePage;
  token: string;
  canDelete: boolean;
}): unknown {
  return jsx("table", {
    id: "article-table",
    children: [
      jsx("thead", {
        children: jsx("tr", {
          children: [
            jsx("th", { scope: "col", children: "Title" }),
            jsx("th", { scope: "col", children: "Slug" }),
            jsx("th", { scope: "col", children: "Status" }),
            jsx("th", { scope: "col", children: "Version" }),
            jsx("th", { scope: "col", children: "Actions" }),
          ],
        }),
      }),
      jsx("tbody", {
        children: page.items.map((article) =>
          articleRow({ article, token, canDelete }),
        ),
      }),
    ],
  });
}

export function articleRow({
  article,
  token,
  canDelete,
}: {
  article: Article;
  token: string;
  canDelete: boolean;
}): unknown {
  return jsx("tr", {
    id: `article-${article.id}`,
    "data-status": article.status,
    children: [
      jsx("td", {
        children: jsx("a", {
          href: `/articles/${article.id}`,
          children: article.title,
        }),
      }),
      jsx("td", { children: article.slug }),
      jsx("td", { children: article.status }),
      jsx("td", { children: String(article.version) }),
      jsx("td", {
        children: [
          jsx("a", { href: `/articles/${article.id}`, children: "Edit" }),
          " ",
          canDelete
            ? jsx("form", {
                method: "post",
                action: `/articles/${article.id}/delete`,
                "hx-post": `/articles/${article.id}/delete`,
                "hx-target": `#article-${article.id}`,
                style: "display: inline",
                children: [
                  jsx("input", { type: "hidden", name: "_csrf", value: token }),
                  jsx("button", { type: "submit", children: "Delete" }),
                ],
              })
            : null,
        ],
      }),
    ],
  });
}

/** Inline edit form (also the create form shape): title + status + version. */
export function articleForm({
  action,
  token,
  title,
  slug,
  status,
  version,
  error,
  submitLabel,
}: {
  action: string;
  token: string;
  title: string;
  slug: string;
  status: string;
  version?: number;
  error: string;
  submitLabel: string;
}): unknown {
  return jsx("form", {
    id: "article-form",
    method: "post",
    action,
    "hx-post": action,
    "hx-target": "#form-region",
    children: [
      jsx("input", { type: "hidden", name: "_csrf", value: token }),
      version !== undefined
        ? jsx("input", {
            type: "hidden",
            name: "version",
            value: String(version),
          })
        : null,
      jsx("label", { for: "title-input", children: "Title" }),
      jsx("input", {
        id: "title-input",
        type: "text",
        name: "title",
        value: title,
        required: true,
      }),
      version === undefined
        ? [
            jsx("label", { for: "slug-input", children: "Slug" }),
            jsx("input", {
              id: "slug-input",
              type: "text",
              name: "slug",
              value: slug,
              required: true,
            }),
          ]
        : null,
      jsx("label", { for: "status-input", children: "Status" }),
      jsx("select", {
        id: "status-input",
        name: "status",
        children: [
          jsx("option", {
            value: "draft",
            ...(status === "draft" ? { selected: true } : {}),
            children: "Draft",
          }),
          jsx("option", {
            value: "published",
            ...(status === "published" ? { selected: true } : {}),
            children: "Published",
          }),
        ],
      }),
      jsx("p", { id: "form-error", role: "alert", children: error }),
      jsx("button", { type: "submit", children: submitLabel }),
    ],
  });
}

/** The audit feed region — an OOB target after mutations. */
export function auditRegion(entries: readonly AuditEntry[]): unknown {
  return jsx("section", {
    id: "audit-region",
    "aria-label": "Recent changes",
    children: [
      jsx("h2", { children: "Recent changes" }),
      jsx("ul", {
        children: entries.map((entry) =>
          jsx("li", {
            key: String(entry.id),
            children: `${entry.actor} · ${entry.action} · ${entry.subject}`,
          }),
        ),
      }),
    ],
  });
}

export function loginForm({
  token,
  error,
}: {
  token: string;
  error: string;
}): unknown {
  return jsx("form", {
    id: "login-form",
    method: "post",
    action: "/login",
    children: [
      jsx("input", { type: "hidden", name: "_csrf", value: token }),
      jsx("fieldset", {
        children: [
          jsx("legend", { children: "Sign in as (fixture users)" }),
          jsx("label", { for: "user-admin", children: "admin (full access)" }),
          jsx("input", {
            id: "user-admin",
            type: "radio",
            name: "user",
            value: "admin",
          }),
          jsx("label", {
            for: "user-editor",
            children: "editor (create/edit)",
          }),
          jsx("input", {
            id: "user-editor",
            type: "radio",
            name: "user",
            value: "editor",
          }),
          jsx("label", { for: "user-viewer", children: "viewer (read only)" }),
          jsx("input", {
            id: "user-viewer",
            type: "radio",
            name: "user",
            value: "viewer",
          }),
        ],
      }),
      jsx("p", { id: "login-error", role: "alert", children: error }),
      jsx("button", { type: "submit", children: "Sign in" }),
    ],
  });
}
