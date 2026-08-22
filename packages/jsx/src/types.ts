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
