/** Todo bootstrap: dialect from the environment (default stable htmx 2). */
import { createTodoApp } from "./app";
import { createInMemoryTodoRepository } from "./domain";

const repository = createInMemoryTodoRepository({
  seed: ["Write the walkthrough", "Verify both browser modes"],
});
const { start } = createTodoApp({ repository });
const server = start(Number(process.env.PORT ?? 3000));
console.log(`todos on http://localhost:${server.port}`);
