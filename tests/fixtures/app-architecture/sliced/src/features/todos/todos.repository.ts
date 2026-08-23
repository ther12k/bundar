import type { Todo } from "./todos.types";
export interface TodoRepo {
  all(): Todo[];
}
