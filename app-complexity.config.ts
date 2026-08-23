/**
 * File-size/responsibility budgets (BR-045).
 *
 * `apps` are scanned; everything else is ignored. Add entries to
 * `exceptions` with owner/reason/reviewDate to approve a hard breach
 * temporarily — expired exceptions fail the gate.
 */
import type { ComplexityConfig } from "./tools/app-complexity/engine";

const config: ComplexityConfig & { readonly apps: readonly string[] } = {
  apps: ["examples/todo", "examples/admin-crud", "templates/minimal"],
  budgets: {},
  exceptions: [
    // Approved during the M8.2 slice migration: the routes module carries
    // the full pre-split handler set pending per-operation extraction.
    {
      path: "examples/admin-crud/src/features/articles/articles.routes.ts",
      owner: "framework-team",
      reason:
        "behavior-preserving extraction landed as one move; per-operation split tracked for M8.3",
      reviewDate: "2026-10-01",
    },
  ],
  excludedSuffixes: [],
};

export default config;
