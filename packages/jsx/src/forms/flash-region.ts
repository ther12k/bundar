/**
 * Accessible flash message region component (GH-063).
 *
 * Renders consumed flash messages into a stable, accessible DOM region.
 * Message content is escaped (plain text, never HTML) with severity-based
 * ARIA roles. When empty, renders a placeholder element to keep the region
 * targetable for out-of-band updates.
 */
import { jsx } from "../jsx-runtime";

/** Structural mirror of @bundar/security's FlashRecord (no import — the
 * frozen ADR-0016 boundary forbids jsx→security). */
export interface FlashMessage {
  readonly id: string;
  readonly severity: "info" | "success" | "warning" | "error";
  readonly message: string;
  readonly createdAtMs: number;
}

export interface FlashRegionProps {
  /** Messages to render; defaults to empty (region still renders). */
  readonly messages?: readonly FlashMessage[];
  /** DOM id of the flash region element. Defaults to "flash-region". */
  readonly id?: string;
}

const ARIA_ROLE_BY_SEVERITY: Record<FlashMessage["severity"], string> = {
  info: "status",
  success: "status",
  warning: "alert",
  error: "alert",
};

export function FlashRegion({
  messages = [],
  id = "flash-region",
}: FlashRegionProps = {}): unknown {
  if (messages.length === 0) {
    // keep the region targetable for OOB updates even when empty
    return jsx("div", {
      id,
      "aria-live": "polite",
      "aria-atomic": "false",
      class: "bundar-flash-region",
    });
  }

  return jsx("div", {
    id,
    "aria-live": "polite",
    "aria-atomic": "false",
    class: "bundar-flash-region",
    children: jsx("ul", {
      class: "bundar-flash-list",
      children: messages.map((message) =>
        jsx("li", {
          key: message.id,
          class: `bundar-flash bundar-flash-${message.severity}`,
          role: ARIA_ROLE_BY_SEVERITY[message.severity],
          "data-flash-id": message.id,
          "data-severity": message.severity,
          // message content is escaped as text (never HTML) — the security
          // of this region depends on jsx's text escaping by default
          children: message.message,
        }),
      ),
    }),
  });
}
