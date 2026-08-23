/**
 * Input validation contract (BR-027): the ONE place that decides what a
 * valid submission looks like. Standard Schema v1 — any conforming
 * validator can replace this without touching routes or views.
 */
import type { StandardSchema } from "@bundar/schema";
import type { SubscribeOutput } from "./subscribe.types";

export const subscribeSchema: StandardSchema<unknown, SubscribeOutput> = {
  "~standard": {
    version: 1,
    vendor: "bundar.starter",
    validate: (value: unknown) => {
      const record = value as Record<string, unknown>;
      const email = typeof record["email"] === "string" ? record["email"] : "";
      if (email.trim().length < 3 || !email.includes("@")) {
        return {
          issues: [
            {
              message: "Enter a valid email address",
              path: ["email"],
            },
          ],
        };
      }
      return { value: { email: email.trim().toLowerCase() } };
    },
  },
};
