/**
 * The ONE dialect decision (bootstrap-time only). The E2E runner swaps
 * this file's export for the htmx4 variant — nothing else changes.
 */
import { htmx2 } from "@bundar/htmx/2";

export const dialect = htmx2;
