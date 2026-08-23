/**
 * GH-073 probe entry: default-exports a composed App instance so
 * `bundar routes generate` can derive the typed URL module offline.
 * Deterministic fixture state only — no side effects at import time.
 */
import { createTodoApp } from "./app";
import { createInMemoryTodoRepository } from "./features/todos/todos.repository";

export default createTodoApp({
  repository: createInMemoryTodoRepository({ seed: ["Seed one"] }),
}).app;
