/**
 * BR-002 test seam: observes every actual composition event performed by
 * {@link composeMiddleware}. Kept in a dedicated internal module so the
 * pinned `@bundar/core` public export surface is unaffected.
 *
 * The GH-018 contract requires one composition per compiled route/method
 * entry at startup; a per-request composer produces one event per request
 * instead, which probes can distinguish from ordinary middleware execution.
 */

export type MiddlewareCompositionListener = (middlewareCount: number) => void;

const compositionListeners = new Set<MiddlewareCompositionListener>();

/** Subscribes to composition events; returns an unsubscribe function. */
export function onMiddlewareComposition(
  listener: MiddlewareCompositionListener,
): () => void {
  compositionListeners.add(listener);
  return () => {
    compositionListeners.delete(listener);
  };
}

/** Invoked by the composer whenever a chain is actually composed. */
export function notifyMiddlewareComposed(middlewareCount: number): void {
  for (const listener of compositionListeners) {
    listener(middlewareCount);
  }
}
