/**
 * Authorization + input contracts for the articles feature (BR-040).
 * Server-side role gates read ONLY the session — HTMX metadata is never
 * consulted for permission or record identity.
 */
import { getSession } from "@bundar/security";
import type { Context } from "@bundar/core";
import type { ArticleStatus } from "./articles.types";

export type AdminRole = "viewer" | "editor" | "admin";

export const ROLE_RANK: Readonly<Record<AdminRole, number>> = {
  viewer: 0,
  editor: 1,
  admin: 2,
};

export function roleOf(context: Context): AdminRole | null {
  const session = getSession(context);
  const role = session?.get("role") as AdminRole | undefined;
  return role !== undefined && role in ROLE_RANK ? role : null;
}

export function userOf(context: Context): string | null {
  const session = getSession(context);
  return (session?.get("user") as string | undefined) ?? null;
}

/** Server-side gate: returns the actor name or null when unauthorized. */
export function requireRole(
  context: Context,
  minimum: AdminRole,
): string | null {
  const role = roleOf(context);
  if (role === null || ROLE_RANK[role] < ROLE_RANK[minimum]) return null;
  return userOf(context);
}

export const ADMIN_ROLE_RANK = ROLE_RANK;

export function canDelete(role: AdminRole | null): boolean {
  return role === "admin";
}

export function isEditor(role: AdminRole | null): boolean {
  return ROLE_RANK[role ?? "viewer"] >= ROLE_RANK.editor;
}

export function parseStatus(value: string | null): ArticleStatus | null {
  return value === "draft" || value === "published" ? value : null;
}

export interface ArticleFormInput {
  readonly title: string;
  readonly slug: string;
  readonly status: ArticleStatus | null;
  readonly expectedVersion?: number;
}

export type ArticleFormResult =
  | {
      readonly ok: true;
      readonly title: string;
      readonly slug: string;
      readonly status: ArticleStatus;
      readonly expectedVersion?: number;
    }
  | { readonly ok: false; readonly message: string };

/** Validates create/edit payloads (title/slug/status/version contract). */
export function validateArticleForm(
  input: ArticleFormInput,
): ArticleFormResult {
  if (
    input.title.length < 2 ||
    input.title.length > 200 ||
    !/^[a-z0-9-]{2,80}$/.test(input.slug) ||
    input.status === null
  ) {
    return { ok: false, message: "Invalid title, slug, or status" };
  }
  return {
    ok: true,
    title: input.title,
    slug: input.slug,
    status: input.status,
    ...(input.expectedVersion !== undefined
      ? { expectedVersion: input.expectedVersion }
      : {}),
  };
}
