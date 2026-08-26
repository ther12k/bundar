/** Shared Todo UI regions (BR-035): real TSX components over typed models. */
import { urls } from "../../routes.gen";
import type { Todo, TodoCounts, TodoFilter } from "./todos.types";

export function countsRegion(counts: TodoCounts, filter: TodoFilter): unknown {
  return (
    <p id="todo-counts">
      {`${counts.all} total · ${counts.active} active · ${counts.done} done · filter: ${filter}`}
    </p>
  );
}

export function filterLinks(active: TodoFilter): unknown {
  const link = (filter: TodoFilter, label: string) => (
    <a
      href={filter === "all" ? "/" : `/?filter=${filter}`}
      {...(active === filter ? { "data-active": "true" } : {})}
    >
      {label}
    </a>
  );
  return (
    <nav id="filters">
      {link("all", "All")} {link("active", "Active")} {link("done", "Done")}
    </nav>
  );
}

export function todoItem({
  item,
  token,
}: {
  item: Todo;
  token: string;
}): unknown {
  const hiddenToken =
    token.length > 0 ? (
      <input type="hidden" name="_csrf" value={token} />
    ) : null;
  return (
    <li id={`todo-${item.id}`} data-done={item.done ? "true" : "false"}>
      <span class="title">{item.title}</span>{" "}
      <form
        method="post"
        action={urls["todo-toggle"]({ id: item.id })}
        hx-post={urls["todo-toggle"]({ id: item.id })}
        hx-target={`#todo-${item.id}`}
        style="display: inline"
      >
        {hiddenToken}
        <button type="submit">{item.done ? "Reopen" : "Done"}</button>
      </form>{" "}
      <form
        method="post"
        action={urls["todo-delete"]({ id: item.id })}
        hx-post={urls["todo-delete"]({ id: item.id })}
        hx-target="#todo-list"
        style="display: inline"
      >
        {token.length > 0 ? (
          <input type="hidden" name="_csrf" value={token} />
        ) : null}
        <button type="submit">Delete</button>
      </form>
    </li>
  );
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
  return (
    <form
      id="todo-form"
      method="post"
      action={urls["todo-create"]()}
      hx-post={urls["todo-create"]()}
      hx-target="#todo-list"
      hx-swap="beforeend"
    >
      <input type="hidden" name="_csrf" value={token} />
      <input
        type="text"
        name="title"
        value={title}
        placeholder="What needs doing?"
        aria-label="Todo title"
        aria-describedby="title-error"
        {...(error ? { "aria-invalid": "true" } : {})}
      />
      <p id="title-error" role="alert">
        {error}
      </p>
      <button type="submit">Add</button>
    </form>
  );
}
