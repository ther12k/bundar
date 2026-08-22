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

const PAGE_SIZE = 5;

export function createInMemoryArticleRepository(
  seed: readonly {
    title: string;
    slug: string;
    status: ArticleStatus;
  }[],
): ArticleRepository {
  const articles = new Map<number, Article>();
  const auditLog: AuditEntry[] = [];
  let nextId = 1;
  let nextAuditId = 1;
  const now = () => 1_700_000_000_000;

  const audit = (actor: string, action: string, subject: string): void => {
    auditLog.push({ id: nextAuditId++, actor, action, subject, atMs: now() });
  };

  for (const item of seed) {
    const id = nextId;
    nextId += 1;
    articles.set(id, { ...item, id, version: 1, updatedAtMs: now() });
  }

  return {
    query({ search, status, page = 1, pageSize = PAGE_SIZE }) {
      let items = [...articles.values()].sort((a, b) => a.id - b.id);
      if (search !== undefined && search.length > 0) {
        const needle = search.toLowerCase();
        items = items.filter(
          (item) =>
            item.title.toLowerCase().includes(needle) ||
            item.slug.toLowerCase().includes(needle),
        );
      }
      if (status !== undefined)
        items = items.filter((item) => item.status === status);
      const total = items.length;
      const pageCount = Math.max(1, Math.ceil(total / pageSize));
      const current = Math.min(Math.max(1, page), pageCount);
      return {
        items: items.slice((current - 1) * pageSize, current * pageSize),
        total,
        page: current,
        pageCount,
      };
    },
    get: (id) => articles.get(id),
    create({ title, slug, status, actor }) {
      const id = nextId;
      nextId += 1;
      const article: Article = {
        id,
        title,
        slug,
        status,
        version: 1,
        updatedAtMs: now(),
      };
      articles.set(id, article);
      audit(actor, "create", `article:${id}`);
      return article;
    },
    update(id, { title, status, actor, expectedVersion }) {
      const existing = articles.get(id);
      if (existing === undefined) return undefined;
      if (existing.version !== expectedVersion) {
        throw new ArticleConflictError(expectedVersion, existing.version);
      }
      const updated: Article = {
        ...existing,
        title,
        status,
        version: existing.version + 1,
        updatedAtMs: now(),
      };
      articles.set(id, updated);
      audit(actor, "update", `article:${id}`);
      return updated;
    },
    remove(id, { actor }) {
      const existing = articles.get(id);
      if (existing === undefined) return false;
      articles.delete(id);
      audit(actor, "delete", `article:${id}`);
      return true;
    },
    audit: (limit) => [...auditLog].slice(-limit).reverse(),
  };
}
