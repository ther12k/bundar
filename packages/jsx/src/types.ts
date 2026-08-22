export type JSXPrimitive =
  string | number | bigint | boolean | null | undefined;

export type JSXNode = Readonly<{
  readonly type: JSXElementType;
  readonly props: Readonly<Record<string, unknown>>;
  readonly key?: string | number | null;
}>;

export type JSXChild = JSXNode | JSXPrimitive | readonly JSXChild[];

export type JSXElementType = string | JSXComponent | symbol;

export type JSXComponent<Props = Record<string, unknown>> = (
  props: Props,
) => JSXChild | Promise<JSXChild>;

import type {
  AnchorAttributes,
  FormAttributes,
  HTMLAttributes,
  InputAttributes,
} from "./types/intrinsic";
export type {
  AnchorAttributes,
  FormAttributes,
  HTMLAttributes,
  InputAttributes,
} from "./types/intrinsic";
export type { UnsupportedClientEvent } from "./types/intrinsic";
export type {
  HtmxAttributes,
  HtmxExperimentalAttributes,
  HtmxStableAttributes,
  HxParamsValue,
  HxPushUrlValue,
  HxSwapBase,
  HxSwapValue,
  HxTargetValue,
} from "./types/htmx";

export type IntrinsicElements = {
  article: HTMLAttributes;
  aside: HTMLAttributes;
  blockquote: HTMLAttributes & Readonly<{ cite?: string }>;
  br: HTMLAttributes;
  canvas: HTMLAttributes & Readonly<{ width?: number; height?: number }>;
  code: HTMLAttributes;
  col: HTMLAttributes;
  colgroup: HTMLAttributes;
  dd: HTMLAttributes;
  details: HTMLAttributes & Readonly<{ open?: boolean }>;
  dl: HTMLAttributes;
  dt: HTMLAttributes;
  em: HTMLAttributes;
  embed: HTMLAttributes & Readonly<{ src?: string; type?: string }>;
  figcaption: HTMLAttributes;
  figure: HTMLAttributes;
  footer: HTMLAttributes;
  h3: HTMLAttributes;
  h4: HTMLAttributes;
  h5: HTMLAttributes;
  h6: HTMLAttributes;
  header: HTMLAttributes;
  hr: HTMLAttributes;
  iframe: HTMLAttributes &
    Readonly<{ src?: string; title?: string; sandbox?: string }>;
  img: HTMLAttributes &
    Readonly<{
      src?: string;
      alt?: string;
      width?: number | string;
      height?: number | string;
      loading?: "eager" | "lazy";
    }>;
  li: HTMLAttributes & Readonly<{ value?: number }>;
  nav: HTMLAttributes;
  noscript: HTMLAttributes;
  ol: HTMLAttributes &
    Readonly<{ start?: number; reversed?: boolean; type?: string }>;
  option: HTMLAttributes &
    Readonly<{
      value?: string | number;
      selected?: boolean;
      disabled?: boolean;
    }>;
  pre: HTMLAttributes;
  select: HTMLAttributes &
    Readonly<{
      name?: string;
      multiple?: boolean;
      required?: boolean;
      disabled?: boolean;
      value?: string;
    }>;
  small: HTMLAttributes;
  summary: HTMLAttributes;
  table: HTMLAttributes;
  tbody: HTMLAttributes;
  td: HTMLAttributes &
    Readonly<{ colspan?: number; rowspan?: number; headers?: string }>;
  textarea: HTMLAttributes &
    Readonly<{
      name?: string;
      rows?: number;
      cols?: number;
      placeholder?: string;
      required?: boolean;
      disabled?: boolean;
      value?: string;
    }>;
  tfoot: HTMLAttributes;
  th: HTMLAttributes &
    Readonly<{
      colspan?: number;
      rowspan?: number;
      scope?: string;
      headers?: string;
    }>;
  thead: HTMLAttributes;
  tr: HTMLAttributes;
  ul: HTMLAttributes;
  video: HTMLAttributes &
    Readonly<{
      src?: string;
      controls?: boolean;
      width?: number;
      height?: number;
    }>;
  a: AnchorAttributes;
  body: HTMLAttributes;
  button: HTMLAttributes & Readonly<{ type?: "button" | "submit" | "reset" }>;
  div: HTMLAttributes;
  form: FormAttributes;
  h1: HTMLAttributes;
  h2: HTMLAttributes;
  head: HTMLAttributes;
  html: HTMLAttributes & Readonly<{ lang?: string }>;
  input: InputAttributes;
  label: HTMLAttributes & Readonly<{ htmlFor?: string }>;
  main: HTMLAttributes;
  meta: HTMLAttributes &
    Readonly<{ charset?: string; name?: string; content?: string }>;
  p: HTMLAttributes;
  script: HTMLAttributes &
    Readonly<{ src?: string; type?: string; nonce?: string }>;
  section: HTMLAttributes;
  span: HTMLAttributes;
  style: HTMLAttributes & Readonly<{ media?: string; nonce?: string }>;
  title: HTMLAttributes;
};

export declare const Fragment: symbol;
