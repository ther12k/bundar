/**
 * GH-073 probe entry: default-exports a composed App instance for typed
 * URL generation. Deterministic fixture state; no import side effects.
 */
import { createAdminApp } from "./app";
import { createInMemoryArticleRepository } from "./features/articles/articles.repository";

export default createAdminApp({
  repository: createInMemoryArticleRepository([
    { title: "Seed", slug: "seed", status: "draft" },
  ]),
}).app;
