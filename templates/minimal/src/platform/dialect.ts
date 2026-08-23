/**
 * The ONE dialect decision in this application — bootstrap-time only.
 * Route handlers and components never branch on the dialect.
 *
 * Switching to the experimental htmx 4 beta changes ONLY this file:
 *
 *   import { htmx4Experimental } from "@bundar/htmx/4";
 *   export const dialect = htmx4Experimental; // 4.0.0-beta6 — beta, no GA claim
 */
import { htmx2 } from "@bundar/htmx/2";

export const dialect = htmx2;
