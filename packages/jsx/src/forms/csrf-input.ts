/**
 * CSRF hidden-input helper (GH-061).
 *
 * Renders the synchronizer token as a hidden form field for the no-JS flow;
 * HTMX flows submit the same token via the x-csrf-token header instead. The
 * token arrives as a plain prop — @bundar/jsx never imports
 * @bundar/security (ADR-0017 boundary). Attribute values are escaped like
 * every attribute.
 */
import { jsx } from "../jsx-runtime";

export interface CsrfInputProps {
  readonly token: string;
  /** Form field name; must match CSRF_FORM_FIELD in @bundar/security. */
  readonly name?: string;
}

export function CsrfInput({ token, name = "_csrf" }: CsrfInputProps): unknown {
  return jsx("input", {
    type: "hidden",
    name,
    value: token,
    autocomplete: "off",
  });
}
