/**
 * renderToString (GH-033): sync/async HTML string rendering with a stable
 * contract. Synchronous trees render synchronously (string, no Promise);
 * async trees await with the same ordering guarantees as the underlying
 * renderers. Development diagnostics are separate from production output.
 */
import { renderNode } from "./render/node";
import { renderNodeAsync, renderNodeAuto } from "./render/async";

export interface RenderOptions {
  /** AbortSignal propagated into async rendering. */
  signal?: AbortSignal;
}

/**
 * Synchronous renderToString: fully synchronous trees return a plain
 * string; a tree containing async components throws with guidance to use
 * `renderToStringAsync`.
 */
export function renderToString(tree: unknown): string {
  return renderNode(tree);
}

/** Async renderToString: resolves async components and promised children. */
export function renderToStringAsync(
  tree: unknown,
  options: RenderOptions = {},
): Promise<string> {
  return renderNodeAsync(tree, { signal: options.signal });
}

/**
 * Automatic: sync trees → string; async trees → Promise<string>.
 * Useful when the caller cannot know the tree shape ahead of time.
 */
export function renderToStringAuto(
  tree: unknown,
  options: RenderOptions = {},
): string | Promise<string> {
  return renderNodeAuto(tree, { signal: options.signal });
}
