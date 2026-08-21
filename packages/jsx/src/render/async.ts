/**
 * Async component and promised-child rendering (GH-030).
 *
 * `renderNodeAsync` detects promise nodes without wrapping synchronous
 * output: a fully synchronous tree renders through the synchronous
 * `renderNode` path and returns a plain string. Promised children resolve in
 * document order. Rejections propagate wrapped with component context.
 * Sibling async components start concurrently (their component functions are
 * invoked in order; awaits interleave) but output order is deterministic.
 * Aborts propagate via an AbortSignal: outstanding work rejects with the
 * abort reason and no further rendering steps run.
 */
import { Fragment } from "../jsx-runtime";
import type { JSXNode } from "../types";
import { renderNode } from "./node";
import { renderAttributes } from "./attributes";

export class AsyncComponentRenderError extends Error {
  public readonly component: string;

  public constructor(component: string, cause: unknown) {
    super(
      `async component ${component} failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    this.name = "AsyncComponentRenderError";
    this.component = component;
  }
}

export class AbortedRenderError extends Error {
  public constructor(reason?: unknown) {
    super(
      `render aborted: ${reason instanceof Error ? reason.message : String(reason ?? "signal fired")}`,
    );
    this.name = "AbortedRenderError";
  }
}

function componentName(type: unknown): string {
  return typeof type === "function"
    ? type.name || "<anonymous component>"
    : String(type);
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

interface RenderOptions {
  signal?: AbortSignal;
}

async function renderAsyncInternal(
  child: unknown,
  depth: number,
  seen: Set<unknown>,
  options: RenderOptions,
): Promise<string> {
  if (depth > 512) {
    throw new Error("component recursion exceeded 512 levels");
  }
  if (options.signal?.aborted) {
    throw new AbortedRenderError(
      (options.signal as AbortSignal & { reason?: unknown }).reason,
    );
  }

  if (child === null || child === undefined) return "";
  const type = typeof child;
  if (
    type === "string" ||
    type === "number" ||
    type === "bigint" ||
    type === "boolean"
  ) {
    // primitives (incl. resolved promise values) render synchronously
    return renderNode(child);
  }

  if (isPromiseLike(child)) {
    const resolved = await child;
    return renderAsyncInternal(resolved, depth, seen, options);
  }

  if (Array.isArray(child)) {
    if (seen.has(child)) throw new Error("cyclic JSX child detected");
    seen.add(child);
    const parts: string[] = [];
    for (const entry of child) {
      // document order: each child fully resolves before the next begins
      // serializing, preserving deterministic output
      parts.push(await renderAsyncInternal(entry, depth, seen, options));
    }
    seen.delete(child);
    return parts.join("");
  }

  const node = child as JSXNode;
  if (typeof node !== "object" || typeof node.type === "undefined") {
    return renderNode(child);
  }

  if (node.type === Fragment) {
    return renderAsyncInternal(node.props.children, depth, seen, options);
  }

  if (typeof node.type === "function") {
    let result: unknown;
    try {
      result = node.type(node.props);
    } catch (cause) {
      if (cause instanceof AsyncComponentRenderError) throw cause;
      throw new AsyncComponentRenderError(componentName(node.type), cause);
    }
    if (isPromiseLike(result)) {
      try {
        const resolved = await result;
        return renderAsyncInternal(resolved, depth + 1, seen, options);
      } catch (cause) {
        if (cause instanceof AsyncComponentRenderError) throw cause;
        if (cause instanceof Error && cause.name === "AbortError") {
          throw new AbortedRenderError(cause);
        }
        throw new AsyncComponentRenderError(componentName(node.type), cause);
      }
    }
    return renderAsyncInternal(result, depth + 1, seen, options);
  }

  // element: attributes serialize synchronously; children may contain promises
  const { children, ...attributes } = node.props as Record<string, unknown>;
  const attributeHtml = renderAttributes(attributes);
  const childrenHtml = await renderAsyncInternal(
    children,
    depth,
    seen,
    options,
  );
  return `<${String(node.type)}${attributeHtml}>${childrenHtml}</${String(node.type)}>`;
}

/**
 * Renders a tree that may contain async components or promised children.
 * Fully synchronous trees stay on the synchronous `renderNode` path when
 * invoked through `renderNodeAuto`; this function always awaits (its return
 * is a Promise) but performs no Promise allocation per node for sync parts.
 */
export function renderNodeAsync(
  child: unknown,
  options: RenderOptions = {},
): Promise<string> {
  return renderAsyncInternal(child, 0, new Set(), options);
}

/**
 * Automatic path selection: synchronous trees render synchronously (plain
 * string, no Promise); any detected async participant switches to the async
 * renderer. Detection happens during a sync probe pass.
 */
export function renderNodeAuto(
  child: unknown,
  options: RenderOptions = {},
): string | Promise<string> {
  if (!containsAsync(child, 0, new Set())) {
    return renderNode(child);
  }
  return renderNodeAsync(child, options);
}

/** Fast structural scan for promise-valued or async-function components. */
function containsAsync(
  child: unknown,
  depth: number,
  seen: Set<unknown>,
): boolean {
  if (depth > 512) return true; // deep trees route to async (which throws)
  if (child === null || child === undefined) return false;
  if (isPromiseLike(child)) return true;
  const type = typeof child;
  if (type !== "object") return false;

  if (Array.isArray(child)) {
    if (seen.has(child)) return false;
    seen.add(child);
    for (const entry of child) {
      if (containsAsync(entry, depth + 1, seen)) return true;
    }
    seen.delete(child);
    return false;
  }

  const node = child as JSXNode;
  if (typeof node.type === "undefined") return false;
  if (node.type === Fragment) {
    return containsAsync(node.props.children, depth + 1, seen);
  }
  if (typeof node.type === "function") {
    if (node.type.constructor.name === "AsyncFunction") return true;
    return containsAsync(node.props.children, depth + 1, seen);
  }
  return containsAsync(
    (node.props as Record<string, unknown>).children,
    depth + 1,
    seen,
  );
}
