/** Shared JSX regions for the Todo app (GH-076). */
import { document, jsx } from "@bundar/jsx";
import { HtmxScript } from "@bundar/htmx";
import type { Todo, TodoCounts, TodoFilter } from "./domain";
import { dialect } from "./dialect";

export function Layout({
  title,
  flash,
  children,
}: {
  title: string;
  flash: readonly { message: string }[];
  children: unknown;
}) {
  return document({
    lang: "en",
    title,
    children: [
      jsx("header", {
        children: jsx("h1", { children: "Bundar Todos" }),
      }),
      // flash region: aria-live so screen readers announce results
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

export function countsRegion(counts: TodoCounts, filter: TodoFilter): unknown {
  return jsx("p", {
    id: "todo-counts",
    children: `${counts.all} total · ${counts.active} active · ${counts.done} done · filter: ${filter}`,
  });
}

export function filterLinks(active: TodoFilter): unknown {
  const link = (filter: TodoFilter, label: string) =>
    jsx("a", {
      href: filter === "all" ? "/" : `/?filter=${filter}`,
      ...(active === filter ? { "data-active": "true" } : {}),
      children: label,
    });
  return jsx("nav", {
    id: "filters",
    children: [
      link("all", "All"),
      " ",
      link("active", "Active"),
      " ",
      link("done", "Done"),
    ],
  });
}

export function todoItem({
  item,
  token,
}: {
  item: Todo;
  token: string;
}): unknown {
  return jsx("li", {
    id: `todo-${item.id}`,
    "data-done": item.done ? "true" : "false",
    children: [
      jsx("span", { class: "title", children: item.title }),
      " ",
      jsx("form", {
        method: "post",
        action: `/todos/${item.id}/toggle`,
        "hx-post": `/todos/${item.id}/toggle`,
        "hx-target": `#todo-${item.id}`,
        style: "display: inline",
        children: [
          ...(token.length > 0
            ? [jsx("input", { type: "hidden", name: "_csrf", value: token })]
            : []),
          jsx("button", {
            type: "submit",
            children: item.done ? "Reopen" : "Done",
          }),
        ],
      }),
      " ",
      jsx("form", {
        method: "post",
        action: `/todos/${item.id}/delete`,
        "hx-post": `/todos/${item.id}/delete`,
        "hx-target": "#todo-list",
        style: "display: inline",
        children: [
          ...(token.length > 0
            ? [jsx("input", { type: "hidden", name: "_csrf", value: token })]
            : []),
          jsx("button", { type: "submit", children: "Delete" }),
        ],
      }),
    ],
  });
}

export function todoForm({
  token,
  title,
  error,
}: {
  token: string;
  title: string;
  error: string;
}): unknown {
  return jsx("form", {
    id: "todo-form",
    method: "post",
    action: "/todos",
    "hx-post": "/todos",
    "hx-target": "#todo-list",
    "hx-swap": "beforeend",
    children: [
      jsx("input", { type: "hidden", name: "_csrf", value: token }),
      jsx("input", {
        type: "text",
        name: "title",
        value: title,
        placeholder: "What needs doing?",
        "aria-label": "Todo title",
      }),
      jsx("p", { id: "title-error", role: "alert", children: error }),
      jsx("button", { type: "submit", children: "Add" }),
    ],
  });
}
