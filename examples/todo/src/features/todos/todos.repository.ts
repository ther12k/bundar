/**
 * Deterministic in-memory repository (GH-076): ids and timestamps come
 * from an injectable sequence/clock so tests never race the wall clock.
 * This is the default adapter for the TodoRepository port declared in
 * `todos.types.ts`; a SQLite backing would implement the same port.
 */
import type { Todo, TodoCounts, TodoRepository } from "./todos.types";

export interface InMemoryTodoOptions {
  /** Deterministic clock (ms); defaults to a fixed base for reproducibility. */
  readonly now?: () => number;
  /** Seed titles created up front with sequential ids. */
  readonly seed?: readonly string[];
}

/** Deterministic in-memory repository; concurrency-safe in-process. */
export function createInMemoryTodoRepository(
  options: InMemoryTodoOptions = {},
): TodoRepository {
  const now = options.now ?? (() => 1_700_000_000_000);
  const items = new Map<number, Todo>();
  let nextId = 1;

  for (const title of options.seed ?? []) {
    const id = nextId;
    nextId += 1;
    items.set(id, {
      id,
      title,
      done: false,
      createdAtMs: now(),
      updatedAtMs: now(),
    });
  }

  const countsOf = (): TodoCounts => {
    let done = 0;
    for (const item of items.values()) if (item.done) done += 1;
    const all = items.size;
    return { all, active: all - done, done };
  };

  return {
    list(filter) {
      const all = [...items.values()].sort((a, b) => a.id - b.id);
      if (filter === "active") return all.filter((item) => !item.done);
      if (filter === "done") return all.filter((item) => item.done);
      return all;
    },
    get: (id) => items.get(id),
    create({ title }) {
      const id = nextId;
      nextId += 1;
      const todo: Todo = {
        id,
        title,
        done: false,
        createdAtMs: now(),
        updatedAtMs: now(),
      };
      items.set(id, todo);
      return todo;
    },
    rename(id, title) {
      const item = items.get(id);
      if (item === undefined) return undefined;
      const updated: Todo = { ...item, title, updatedAtMs: now() };
      items.set(id, updated);
      return updated;
    },
    toggle(id) {
      const item = items.get(id);
      if (item === undefined) return undefined;
      const updated: Todo = { ...item, done: !item.done, updatedAtMs: now() };
      items.set(id, updated);
      return updated;
    },
    remove: (id) => items.delete(id),
    counts: countsOf,
  };
}
