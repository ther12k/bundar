/**
 * Deterministic in-memory article repository (GH-077): optimistic
 * concurrency via versions plus an append-only audit log.
 */
import {
  ArticleConflictError,
  type Article,
  type ArticleRepository,
  type ArticleStatus,
  type AuditEntry,
} from "./articles.types";

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
