/**
 * Admin CRUD domain (GH-077): a small deterministic article repository
 * with optimistic concurrency (versions) and an append-only audit log.
 * Seeded data is fixed and fictional — no real-looking personal data.
 */
export type ArticleStatus = "draft" | "published";

export interface Article {
  readonly id: number;
  title: string;
  slug: string;
  status: ArticleStatus;
  /** Optimistic-concurrency token; increments on every write. */
  readonly version: number;
  readonly updatedAtMs: number;
}

export interface AuditEntry {
  readonly id: number;
  readonly actor: string;
  readonly action: string;
  readonly subject: string;
  readonly atMs: number;
}

export class ArticleConflictError extends Error {
  public constructor(
    public readonly expected: number,
    public readonly actual: number,
  ) {
    super(`stale version: expected ${expected}, current is ${actual}`);
    this.name = "ArticleConflictError";
  }
}

export interface ArticleQuery {
  readonly search?: string;
  readonly status?: ArticleStatus;
  readonly page?: number;
  readonly pageSize?: number;
}

export interface ArticlePage {
  readonly items: readonly Article[];
  readonly total: number;
  readonly page: number;
  readonly pageCount: number;
}

export interface ArticleRepository {
  query(query: ArticleQuery): ArticlePage;
  get(id: number): Article | undefined;
  create(input: {
    title: string;
    slug: string;
    status: ArticleStatus;
    actor: string;
  }): Article;
  update(
    id: number,
    input: {
      title: string;
      status: ArticleStatus;
      actor: string;
      expectedVersion: number;
    },
  ): Article | undefined;
  remove(id: number, input: { actor: string }): boolean;
  audit(limit: number): readonly AuditEntry[];
}
