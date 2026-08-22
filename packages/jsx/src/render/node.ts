/**
 * Server JSX node flattening and rendering (GH-029).
 *
 * Renders a JSX child tree to an HTML string synchronously: Fragment,
 * functional components (plain functions, no lifecycle), nested arrays,
 * approved iterables, and primitives. Keys never reach the output. Cyclic
 * structures and runaway component recursion fail with actionable
 * diagnostics. Async components are GH-030 and rejected here with a pointer.
 */
import { renderPrimitive } from "../escape";
import { renderAttributes } from "./attributes";
import { Fragment } from "../jsx-runtime";
import { isRawTextElement, isVoidElement, serializeRawText } from "./elements";
import type { JSXChild, JSXNode } from "../types";

/** Maximum component-invocation depth before runaway recursion fails. */
export const MAX_COMPONENT_DEPTH = 512;

export class CyclicChildError extends Error {
  public constructor() {
    super(
      "cyclic JSX child detected: a child structure references itself; server rendering requires a tree",
    );
    this.name = "CyclicChildError";
  }
}

export class ComponentRenderError extends Error {
  public readonly component: string;

  public constructor(component: string, cause: unknown) {
    super(
      `component ${component} failed to render: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    this.name = "ComponentRenderError";
    this.component = component;
  }
}

export class AsyncComponentError extends Error {
  public constructor(component: string) {
    super(
      `component ${component} returned a Promise; async components land with GH-030 — keep components synchronous for now`,
    );
    this.name = "AsyncComponentError";
  }
}

function isIterable(value: unknown): value is Iterable<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] ===
      "function"
  );
}

function componentName(type: unknown): string {
  if (typeof type === "function") {
    return type.name || "<anonymous component>";
  }
  return String(type);
}

function renderNodeInternal(
  child: unknown,
  depth: number,
  seen: Set<unknown>,
): string {
  if (child === null || child === undefined) return "";
  const type = typeof child;
  if (
    type === "string" ||
    type === "number" ||
    type === "bigint" ||
    type === "boolean"
  ) {
    return renderPrimitive(child);
  }

  if (Array.isArray(child)) {
    if (seen.has(child)) throw new CyclicChildError();
    seen.add(child);
    let out = "";
    for (const entry of child) {
      out += renderNodeInternal(entry, depth, seen);
    }
    seen.delete(child);
    return out;
  }

  if (isIterable(child)) {
    // Sets, generators, and other non-array iterables render in iteration
    // order; iteration is consumed once.
    if (seen.has(child)) throw new CyclicChildError();
    seen.add(child);
    let out = "";
    for (const entry of child) {
      out += renderNodeInternal(entry, depth, seen);
    }
    seen.delete(child);
    return out;
  }

  const node = child as JSXNode;
  if (typeof node !== "object" || typeof node.type === "undefined") {
    // renderPrimitive rejects objects/functions with diagnostics
    return renderPrimitive(child);
  }

  if (node.type === Fragment) {
    return renderNodeInternal(node.props.children, depth, seen);
  }

  if (typeof node.type === "function") {
    if (depth >= MAX_COMPONENT_DEPTH) {
      throw new Error(
        `component recursion exceeded ${MAX_COMPONENT_DEPTH} levels: check for a component rendering itself`,
      );
    }
    let result: unknown;
    try {
      result = node.type(node.props);
    } catch (cause) {
      if (cause instanceof ComponentRenderError) throw cause;
      throw new ComponentRenderError(componentName(node.type), cause);
    }
    if (
      typeof result === "object" &&
      result !== null &&
      typeof (result as { then?: unknown }).then === "function"
    ) {
      throw new AsyncComponentError(componentName(node.type));
    }
    return renderNodeInternal(result, depth + 1, seen);
  }

  const tag = String(node.type);

  // GH-032: void elements never receive closing tags.
  if (isVoidElement(tag)) {
    const attributes = renderAttributes(node.props as Record<string, unknown>);
    return `<${tag}${attributes}>`;
  }

  // GH-032: raw-text elements keep text children unescaped, with close-tag
  // sequences neutralized so content cannot break out of the element.
  if (isRawTextElement(tag)) {
    const attributes = renderAttributes(node.props as Record<string, unknown>);
    const text = node.props.children;
    const body =
      typeof text === "string"
        ? serializeRawText(tag, text)
        : renderNodeInternal(text, depth, seen);
    return `<${tag}${attributes}>${body}</${tag}>`;
  }

  const attributes = renderAttributes(node.props as Record<string, unknown>);
  const children = renderNodeInternal(node.props.children, depth, seen);
  return `<${tag}${attributes}>${children}</${tag}>`;
}

/** Renders any JSX child tree to its HTML string form. */
export function renderNode(child: JSXChild | unknown): string {
  return renderNodeInternal(child, 0, new Set());
}
