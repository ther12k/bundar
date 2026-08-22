/** Fixture: explicit, auditable suppression of a known-and-verified finding. */
export function verifiedTriggerHeader(): Record<string, string> {
  return { "HX-Trigger": "audited-manually" }; // bundar-audit-ignore: header-rename
}
