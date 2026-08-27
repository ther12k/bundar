export type DistTags = Record<string, string>;

export function normalizeDistTags(value: unknown): DistTags | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const nested = record.distTags;
  if (nested !== null && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as DistTags;
  }
  return record as DistTags;
}
