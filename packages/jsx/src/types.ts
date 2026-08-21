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

export type UnsupportedClientEvent =
  "Bundar server JSX does not support browser event handlers; use an htmx attribute or server action.";

export type HTMLAttributes = Readonly<{
  id?: string;
  class?: string;
  className?: string;
  style?: string | Readonly<Record<string, string | number>>;
  title?: string;
  role?: string;
  tabIndex?: number;
  hidden?: boolean;
  children?: JSXChild;
  onClick?: UnsupportedClientEvent;
  onChange?: UnsupportedClientEvent;
  onInput?: UnsupportedClientEvent;
  onSubmit?: UnsupportedClientEvent;
}>;

export type AnchorAttributes = HTMLAttributes &
  Readonly<{
    href?: string;
    target?: string;
    rel?: string;
  }>;

export type FormAttributes = HTMLAttributes &
  Readonly<{
    action?: string;
    method?: "get" | "post" | "dialog";
    enctype?: string;
  }>;

export type InputAttributes = HTMLAttributes &
  Readonly<{
    name?: string;
    type?: string;
    value?: string | number;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
  }>;

export type IntrinsicElements = {
  a: AnchorAttributes;
  button: HTMLAttributes & Readonly<{ type?: "button" | "submit" | "reset" }>;
  div: HTMLAttributes;
  form: FormAttributes;
  h1: HTMLAttributes;
  h2: HTMLAttributes;
  input: InputAttributes;
  label: HTMLAttributes & Readonly<{ htmlFor?: string }>;
  main: HTMLAttributes;
  p: HTMLAttributes;
  section: HTMLAttributes;
  span: HTMLAttributes;
};

export declare const Fragment: symbol;
