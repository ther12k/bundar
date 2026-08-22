/**
 * GH-049 proxy-cache fixture: a minimal shared-cache simulator implementing
 * the representation-poisoning mechanics — entries keyed on URL, variant
 * selection by Vary field matching between the storing request and later
 * requests, storage forbidden for private/no-store responses. Deliberately
 * small: it exists to REPRODUCE the risk in tests, not to model a real CDN.
 */

export interface StoredRepresentation {
  readonly url: string;
  readonly vary: readonly string[];
  readonly storedFieldValues: Readonly<Record<string, string>>;
  readonly body: string;
}

export class SimulatedProxyCache {
  private readonly entries = new Map<string, StoredRepresentation[]>();

  /**
   * RFC 7234-flavored: never store `no-store`/`private` responses. The
   * storing request's vary-field values are captured with the entry so a
   * later lookup can decide whether this variant is the right one.
   */
  store(
    response: Response,
    url: string,
    body: string,
    requestHeaders: Headers,
  ): boolean {
    const cacheControl = (
      response.headers.get("cache-control") ?? ""
    ).toLowerCase();
    if (cacheControl.includes("no-store") || cacheControl.includes("private")) {
      return false;
    }
    const vary = (response.headers.get("vary") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const storedFieldValues: Record<string, string> = {};
    for (const field of vary) {
      storedFieldValues[field.toLowerCase()] = requestHeaders.get(field) ?? "";
    }
    const list = this.entries.get(url) ?? [];
    // same vary set + same field values = the same variant, refreshed in
    // place; a DIFFERENT variant must never overwrite another (poisoning)
    const kept = list.filter(
      (entry) =>
        !(
          entry.vary.length === vary.length &&
          vary.every((field, index) => field === entry.vary[index]) &&
          vary.every(
            (field) =>
              entry.storedFieldValues[field.toLowerCase()] ===
              storedFieldValues[field.toLowerCase()],
          )
        ),
    );
    kept.push({ url, vary, storedFieldValues, body });
    this.entries.set(url, kept);
    return true;
  }

  /** Selects a stored variant whose vary fields all match the request. */
  lookup(url: string, requestHeaders: Headers): StoredRepresentation | null {
    const list = this.entries.get(url);
    if (list === undefined) return null;
    for (const entry of list) {
      const matches = entry.vary.every(
        (field) =>
          entry.storedFieldValues[field.toLowerCase()] ===
          (requestHeaders.get(field) ?? ""),
      );
      if (matches) return entry;
    }
    return null;
  }

  /** Variant count for one URL (test evidence: variants never overwrite). */
  variants(url: string): number {
    return this.entries.get(url)?.length ?? 0;
  }

  clear(): void {
    this.entries.clear();
  }
}
