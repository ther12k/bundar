/**
 * @bundar/core public surface.
 *
 * GH-013 adds registration and immutable manifest construction. GH-014 adds
 * path normalization and conflict diagnostics. GH-015 compiles descriptors to
 * native `Bun.serve` route tables. GH-016 guards the static fast path.
 * GH-017 adds the per-request context. GH-018 adds startup-composed
 * middleware. GH-019 adds params/query/cookie adapters. Error handling lands
 * with GH-020–GH-022.
 */
export * from "./app";
export * from "./context";
export * from "./middleware";
export * from "./module";
export * from "./request/adapters";
export * from "./routing/compiler";
export * from "./routing/conflicts";
export * from "./routing/path";
export * from "./routing/types";
