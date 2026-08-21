import type {
  CapabilityMap,
  CapabilitySupport,
  HtmxCapability,
} from "./dialect";

/** Builds a complete capability map, failing if any capability is missing. */
export function capabilities(
  entries: Partial<Record<HtmxCapability, CapabilitySupport>>,
): CapabilityMap {
  const all: HtmxCapability[] = [
    "request-metadata",
    "response-directives",
    "trigger-after-swap",
    "trigger-after-settle",
    "out-of-band-swaps",
    "history-actions",
    "cache-control",
  ];
  const map = {} as Record<HtmxCapability, CapabilitySupport>;
  for (const capability of all) {
    const support = entries[capability];
    if (!support) {
      throw new Error(
        `capability map is incomplete: missing "${capability}" (every capability must declare native, emulated, or unsupported)`,
      );
    }
    map[capability] = support;
  }
  return Object.freeze(map);
}

/** True only when the dialect implements the capability natively upstream. */
export function isNative(
  map: CapabilityMap,
  capability: HtmxCapability,
): boolean {
  return map[capability] === "native";
}

/** True when the dialect approximates the capability through other means. */
export function isEmulated(
  map: CapabilityMap,
  capability: HtmxCapability,
): boolean {
  return map[capability] === "emulated";
}

/** True when the dialect cannot provide the capability at all. */
export function isUnsupported(
  map: CapabilityMap,
  capability: HtmxCapability,
): boolean {
  return map[capability] === "unsupported";
}
