/**
 * Todo domain (GH-076): a deterministic repository interface plus an
 * in-memory implementation. Determinism is a fixture property — ids and
 * timestamps come from an injectable sequence/clock, so tests never race
 * the wall clock. Operations are serial within the single-threaded Bun
 * runtime; the interface is the seam a SQLite backing would implement.
 */
export interface Todo {
  readonly id: number;
  title: string;
  readonly done: boolean;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
}

export type TodoFilter = "all" | "active" | "done";

export interface TodoCounts {
  readonly all: number;
  readonly active: number;
  readonly done: number;
}

export interface TodoRepository {
  list(filter: TodoFilter): readonly Todo[];
  get(id: number): Todo | undefined;
  create(input: { title: string }): Todo;
  rename(id: number, title: string): Todo | undefined;
  toggle(id: number): Todo | undefined;
  remove(id: number): boolean;
  counts(): TodoCounts;
}

export class TodoDomainError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TodoDomainError";
  }
}
