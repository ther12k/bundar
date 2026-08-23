/**
 * Input validation contract for the todos feature (BR-034). Standard
 * Schema v1; any conforming validator can replace it without touching
 * routes or views.
 */
import type { StandardSchema } from "@bundar/schema";

export interface TodoTitleInput {
  readonly title: string;
}

export const titleSchema: StandardSchema<unknown, TodoTitleInput> = {
  "~standard": {
    version: 1,
    vendor: "bundar.todo",
    validate: (value: unknown) => {
      const record = value as Record<string, unknown>;
      const title =
        typeof record["title"] === "string" ? record["title"].trim() : "";
      if (title.length < 2 || title.length > 200) {
        return {
          issues: [
            { message: "Title must be 2–200 characters", path: ["title"] },
          ],
        };
      }
      return { value: { title } };
    },
  },
};

/** Filter query parsing lives beside the schema as a pure function. */
export type TodoFilterKind = import("./todos.types").TodoFilter;

export function parseFilter(value: string | null): TodoFilterKind {
  return value === "active" || value === "done" ? value : "all";
}
