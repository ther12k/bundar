/**
 * Cache variation and history safety policy (GH-049).
 *
 * One URL can serve several representations — full document, fragment,
 * boosted document, history-restore document — so a shared cache keyed on
 * URL alone poisons responses across variants. The policy makes the safe
 * behavior the default and the unsafe behavior an explicit opt-in:
 *
 * - `Vary` always names every negotiation input (GH-048's headers) and
 *   merges with existing values losslessly (case-insensitive, order
 *   preserved, duplicates dropped).
 * - Cache-control defaults to `no-store` for both documents and fragments.
 *   Shared caching (`s-maxage`) and client caching (`max-age`) are opt-ins;
 *   private/authenticated content can never combine with `public`.
 * - History differences between htmx 2 and htmx 4 beta are explicit data
 *   (`historyPolicyFor`), so restore behavior is never guessed.
 */
import type { NegotiatedView } from "./view";
import { VIEW_VARY_HEADERS } from "./view";
import type { HtmxDialectAdapter } from "./dialect";

/** Merges Vary values without loss: existing entries keep their order,
 * additions are appended once (case-insensitive), nothing is dropped. */
export function mergeVary(
  existing: string | null | undefined,
  additions: readonly string[],
): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  const push = (value: string): void => {
    const key = value.trim().toLowerCase();
    if (key.length === 0 || seen.has(key)) return;
    seen.add(key);
    parts.push(value.trim());
  };
  for (const entry of (existing ?? "").split(",")) push(entry);
  for (const entry of additions) push(entry);
  return parts.join(", ");
}

export interface CachePolicyOptions {
  /** Authenticated/private content: never `public`, never shared-cached. */
  readonly private?: boolean;
  /** Opt in to shared caching (implies `public` unless private). Seconds. */
  readonly sMaxage?: number;
  /** Opt in to client/browser caching. Seconds. Cannot exceed sMaxage. */
  readonly maxAge?: number;
}

export class CachePolicyError extends Error {
  public constructor(detail: string) {
    super(`cache policy violation: ${detail}`);
    this.name = "CachePolicyError";
  }
}

export interface CachePolicy {
  /** The negotiation inputs this representation varies on. */
  readonly vary: readonly string[];
  /** The recommended Cache-Control value (fail-safe by default). */
  readonly cacheControl: string;
}

const NO_STORE = "no-store";

/**
 * The cache policy for a negotiated representation. Defaults are
 * fail-safe: `no-store` and the full negotiation Vary. Opt-ins are
 * validated: `private` plus `s-maxage` is rejected (a private
 * representation can never be publicly cached), and `max-age` may not
 * exceed `s-maxage` (a stale client copy outliving the shared one).
 */
export function cachePolicyFor(
  negotiated: NegotiatedView,
  options: CachePolicyOptions = {},
): CachePolicy {
  const vary = negotiated.vary;
  if (options.private === true && options.sMaxage !== undefined) {
    throw new CachePolicyError(
      "private content cannot opt into shared caching (s-maxage)",
    );
  }
  if (
    options.sMaxage !== undefined &&
    options.maxAge !== undefined &&
    options.maxAge > options.sMaxage
  ) {
    throw new CachePolicyError(
      "max-age cannot exceed s-maxage (client copies would outlive the shared representation)",
    );
  }
  if (options.private === true) {
    return {
      vary,
      cacheControl:
        options.maxAge === undefined
          ? `private, ${NO_STORE}`
          : `private, max-age=${options.maxAge}`,
    };
  }
  if (options.sMaxage !== undefined) {
    const maxAge = options.maxAge ?? 0;
    return {
      vary,
      cacheControl: `public, max-age=${maxAge}, s-maxage=${options.sMaxage}`,
    };
  }
  if (options.maxAge !== undefined) {
    return { vary, cacheControl: `private, max-age=${options.maxAge}` };
  }
  return { vary, cacheControl: NO_STORE };
}

/**
 * Applies a policy to a response: Vary merges with any existing value
 * (nothing lost), and Cache-Control is set only when the handler did not
 * set one — explicit handler values are an override, never clobbered.
 */
export function applyCachePolicy(
  response: Response,
  policy: CachePolicy,
): Response {
  const headers = new Headers(response.headers);
  headers.set("vary", mergeVary(headers.get("vary"), policy.vary));
  if (!headers.has("cache-control")) {
    headers.set("cache-control", policy.cacheControl);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export interface HistoryPolicy {
  /** Header htmx sends when refetching a URL to restore history state. */
  readonly restoreRequestHeader: "HX-History-Restore-Request" | null;
  /** Whether the dialect pushes URLs into history by default. */
  readonly pushUrlDefault: boolean;
  /** Dialect-specific notes that affect caching/history decisions. */
  readonly notes: readonly string[];
}

/**
 * Explicit per-dialect history facts (never guessed): htmx 2 pushes URLs by
 * default and refetches with HX-History-Restore-Request; the htmx 4 beta
 * keeps the restore header but flips the push default to false.
 */
export function historyPolicyFor(adapter: HtmxDialectAdapter): HistoryPolicy {
  // adapters namespace their profile under "<id>:profile" (GH-043/044);
  // read the history record from wherever the adapter exposes it
  const metadata = adapter.metadata as Record<string, unknown>;
  const profileKey = Object.keys(metadata).find((key) =>
    key.endsWith(":profile"),
  );
  const profile = (
    profileKey === undefined ? undefined : metadata[profileKey]
  ) as
    | {
        history?: {
          pushUrlDefault?: boolean;
          historyRestoreRequestHeader?: boolean;
          historyCacheRework?: string;
        };
      }
    | undefined;
  const history = profile?.history;
  const restoreHeader =
    history?.historyRestoreRequestHeader === false
      ? null
      : "HX-History-Restore-Request";
  return {
    restoreRequestHeader: restoreHeader,
    pushUrlDefault: history?.pushUrlDefault ?? false,
    notes: [
      `dialect ${adapter.id} (${adapter.maturity})`,
      ...(restoreHeader === null
        ? [
            "history restore requests carry no distinguishing header — capability-gate restore scenarios for this dialect",
          ]
        : []),
      ...(history?.historyCacheRework !== undefined
        ? [history.historyCacheRework]
        : []),
    ],
  };
}

/** The negotiation inputs every view representation varies on (GH-048). */
export const CACHE_VARY_HEADERS: readonly string[] = VIEW_VARY_HEADERS;
