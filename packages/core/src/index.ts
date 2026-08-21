/**
 * @bundar/core public surface.
 *
 * GH-013 adds registration and immutable manifest construction. Path
 * normalization/conflict validation and compilation to `Bun.serve` route
 * tables remain GH-014–GH-015; context, middleware, and error handling land
 * with GH-017–GH-022.
 */
export * from "./app";
export * from "./module";
export * from "./routing/types";
