/**
 * Session identifier lifecycle (GH-062).
 *
 * IDs are 32 bytes from crypto.getRandomValues, base64url-encoded — opaque,
 * never derived from client data, never logged. Validation is shape-only:
 * any cookie that is not a canonical ID is treated as absent so malformed or
 * forged values can never reach a store lookup as a valid key.
 */
const ID_BYTES = 32;

export function generateSessionId(): string {
  const bytes = new Uint8Array(ID_BYTES);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

/** Canonical session IDs are exactly 43 base64url characters. */
export function isCanonicalSessionId(
  value: string | undefined,
): value is string {
  return value !== undefined && /^[A-Za-z0-9_-]{43}$/.test(value);
}
