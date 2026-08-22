/**
 * Intrinsic element attribute maps (GH-028, GH-035).
 *
 * Element-specific attribute types stay here; the stable common `hx-*`
 * subset (plus app-augmented experimental attributes) merges into the base
 * so every intrinsic element typechecks htmx attributes while raw names
 * remain visible in source and output — the renderer never rewrites them.
 */
import type { JSXChild } from "../types";
import type { HtmxAttributes } from "./htmx";

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
}> &
  HtmxAttributes;

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
