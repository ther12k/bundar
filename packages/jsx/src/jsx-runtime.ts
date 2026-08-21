import type { JSXChild, JSXElementType, JSXNode } from "./types";

export const Fragment = Symbol.for("bundar.jsx.fragment");

export function jsx(
  type: JSXElementType,
  props: Record<string, unknown> | null,
  key?: string | number,
): JSXNode {
  return Object.freeze({
    type,
    props: Object.freeze({ ...(props ?? {}) }),
    ...(key === undefined ? {} : { key }),
  });
}

export const jsxs = jsx;

export function jsxDEV(
  type: JSXElementType,
  props: Record<string, unknown> | null,
  key?: string | number,
): JSXNode {
  return jsx(type, props, key);
}

export type { JSXChild, JSXElementType, JSXNode };

/**
 * JSX namespace required by the TypeScript automatic JSX transform. The
 * `no-namespace` rule is disabled for this declaration because TypeScript's JSX
 * machinery mandates the `JSX` namespace at module level in the jsx-runtime and
 * jsx-dev-runtime entry points; there is no equivalent module-export alternative
 * that `react-jsx` will resolve.
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace JSX {
  export type Element = JSXNode;
  export type ElementType = JSXElementType;
  export type ElementClass = JSXNode;
  export type ElementAttributesProperty = { props: unknown };
  export type ElementChildrenAttribute = { children: unknown };
  export type IntrinsicElements = import("./types").IntrinsicElements;
  export type IntrinsicAttributes = Readonly<{ key?: string | number | null }>;
}
