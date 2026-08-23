/** Admin bootstrap: dialect from the environment (default stable htmx 2). */
import { createAdminApp } from "./app";
import { createInMemoryArticleRepository } from "./features/articles/articles.repository";

const repository = createInMemoryArticleRepository([
  {
    title: "Alpha announcement",
    slug: "alpha-announcement",
    status: "published",
  },
  { title: "Beta notes", slug: "beta-notes", status: "draft" },
  { title: "Migration guide", slug: "migration-guide", status: "published" },
  {
    title: "Security overview",
    slug: "security-overview",
    status: "published",
  },
  { title: "Roadmap update", slug: "roadmap-update", status: "draft" },
  { title: "Release checklist", slug: "release-checklist", status: "draft" },
  {
    title: "Fixture article seven",
    slug: "fixture-seven",
    status: "published",
  },
]);
const { start } = createAdminApp({ repository });
const server = start(Number(process.env.PORT ?? 3000));
console.log(`admin on http://localhost:${server.port}`);
