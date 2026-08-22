/**
 * GH-058 external schema-consumer fixture: two real, independent Standard
 * Schema validators (Zod 4 and Valibot 1) consumed through @bundar/schema
 * exactly as an external app would — schema definitions, type inference
 * through the adapter, and coercion owned by the validator, never by Bundar.
 */
import * as v from "valibot";
import { z } from "zod";
import type { Context } from "@bundar/core";
import { validateForm, validateJson, validateQuery } from "@bundar/schema";

export const zodUser = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  // coercion is the validator's responsibility: the form source supplies
  // strings; zod's coerce turns them into numbers before validation
  age: z.coerce.number().int().min(0).max(150),
});

export type ZodUser = z.infer<typeof zodUser>;

export const valibotSearch = v.object({
  q: v.pipe(v.string(), v.minLength(1)),
  page: v.optional(v.pipe(v.string(), v.regex(/^\d+$/)), "1"),
});

export type ValibotSearch = v.InferOutput<typeof valibotSearch>;

export const valibotPayload = v.object({
  id: v.pipe(v.number(), v.minValue(1)),
  tags: v.array(v.string()),
});

/** Compile-time proof: the adapter's output type is the schema's output. */
export function assertInference(
  zodResult: ZodUser,
  valibotResult: ValibotSearch,
): { zod: { name: string; age: number }; valibot: { q: string } } {
  return {
    zod: { name: zodResult.name, age: zodResult.age },
    valibot: { q: valibotResult.q },
  };
}

declare const context: Context;

export async function typedForm(): Promise<ZodUser | null> {
  const result = await validateForm(context, zodUser);
  if (result.success) {
    const user: ZodUser = result.value; // typed validated value, no casts
    return user;
  }
  return null;
}

export async function typedQuery(): Promise<ValibotSearch | null> {
  const result = await validateQuery(context, valibotSearch);
  return result.success ? result.value : null;
}

export async function typedJson(): Promise<v.InferOutput<
  typeof valibotPayload
> | null> {
  const result = await validateJson(context, valibotPayload);
  return result.success ? result.value : null;
}

void assertInference;
