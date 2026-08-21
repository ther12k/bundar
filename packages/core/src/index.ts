/**
 * @bundar/core public surface.
 *
 * GH-012 exports the typed route model. Runtime routing (builder, path
 * normalization, compilation to `Bun.serve` route tables) lands with
 * GH-013–GH-015; context, middleware, and error handling with GH-017–GH-022.
 */
export * from "./routing/types";
