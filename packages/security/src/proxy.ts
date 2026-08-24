/**
 * Trusted-proxy client model (BR-059).
 *
 * FAIL-CLOSED DEFAULT: forwarded metadata (RFC 7239 `Forwarded`,
 * `X-Forwarded-For`, `-Proto`, `-Host`) is IGNORED unless the application
 * explicitly configures a trusted-proxy allowlist. The transport peer —
 * as reported by the runtime — is the only client identity by default.
 *
 * When trust IS configured, the RIGHTMOST untrusted hop algorithm applies:
 * walk X-Forwarded-For from right to left; skip entries matching trusted
 * proxies; stop at (and return) the first untrusted address. More hops
 * than `maxHops` or any malformed entry fails closed to the raw peer.
 */

export interface ProxyTrustConfig {
  /**
   * Trusted proxy addresses or IPv4 CIDRs (e.g. "10.0.0.5", "10.0.0.0/8").
   * IPv6 exact addresses supported; IPv4-mapped IPv6 (::ffff:a.b.c.d) is
   * normalized before comparison.
   */
  readonly proxies: readonly string[];
  /** Maximum forwarded hops processed (default 1; hard cap 32). */
  readonly maxHops?: number;
}

export interface ResolvedClient {
  /** Best-effort client address (peer, or leftmost trusted-derived IP). */
  readonly address: string;
  /** Normalized scheme: "https" | "http" | "unknown". */
  readonly proto: "https" | "http" | "unknown";
  /** Host as presented by the (possibly proxied) request. */
  readonly host: string | null;
  /** Whether ANY forwarded metadata was honored for this resolution. */
  readonly forwardedTrusted: boolean;
}

/** True when the deployment explicitly trusts at least one proxy. */
export function isProxyTrusted(config: ProxyTrustConfig | undefined): boolean {
  return (
    config !== undefined &&
    Array.isArray(config.proxies) &&
    config.proxies.length > 0
  );
}

function normalizeIp(value: string): string {
  const trimmed = value.trim();
  // IPv4-mapped IPv6 → plain IPv4 for comparison.
  const mapped = trimmed.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  return mapped !== null ? mapped[1]! : trimmed.toLowerCase();
}

function ipToLong(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let result = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    result = result * 256 + n;
  }
  return result;
}

function isTrustedAddress(address: string, config: ProxyTrustConfig): boolean {
  const normalized = normalizeIp(address);
  for (const entry of config.proxies) {
    const proxy = normalizeIp(entry);
    if (proxy === normalized) return true;
    const cidr = proxy.match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
    if (cidr !== null) {
      const base = ipToLong(cidr[1]!);
      const target = ipToLong(normalized);
      const bits = Number(cidr[2]);
      if (base === null || target === null || !(bits >= 0 && bits <= 32))
        continue;
      const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
      if ((base & mask) === (target & mask)) return true;
    }
  }
  return false;
}

function parseProto(
  forwardedHeader: string | null,
  xfp: string | null,
): "https" | "http" | "unknown" {
  const raw = (
    forwardedHeader !== null ? protoFromRfc7239(forwardedHeader) : xfp
  )
    ?.trim()
    .toLowerCase();
  if (raw === "https") return "https";
  if (raw === "http") return "http";
  return "unknown";
}

function protoFromRfc7239(header: string): string | null {
  for (const part of header.split(",")) {
    const match = part.match(/proto\s*=\s*"?([^";]+)"?/i);
    if (match !== null) return match[1]!;
  }
  return null;
}

/**
 * Resolves the normalized client identity for one request.
 *
 * @param peer - transport-level remote address (from the server runtime).
 * Failing to pass it means "no proxy trust is possible": the resolution
 * degrades to unknown-address with forwarded headers still ignored.
 */
export function resolveClient(
  request: Request,
  peer: string | null,
  config?: ProxyTrustConfig,
): ResolvedClient {
  const url = new URL(request.url);
  const host = url.host;

  // Fail-closed default: no trust configured → forwarded headers ignored.
  if (!isProxyTrusted(config)) {
    return {
      address: peer ?? "unknown",
      proto: url.protocol === "https:" ? "https" : "http",
      host,
      forwardedTrusted: false,
    };
  }

  const maxHops = Math.min(config?.maxHops ?? 1, 32);

  // The IMMEDIATE peer must itself be a trusted proxy; otherwise forwarded
  // data came from an untrusted hop and is discarded entirely.
  if (peer === null || !isTrustedAddress(peer, config!)) {
    return {
      address: peer ?? "unknown",
      proto: url.protocol === "https:" ? "https" : "http",
      host,
      forwardedTrusted: false,
    };
  }

  const xff = request.headers.get("x-forwarded-for");
  if (xff === null) {
    return {
      address: peer,
      proto: url.protocol === "https:" ? "https" : "http",
      host,
      forwardedTrusted: false,
    };
  }

  const hops = xff.split(",").map((h) => normalizeIp(h));
  // Malformed entry anywhere in the chain → fail closed to the peer.
  for (const hop of hops) {
    if (hop.length === 0 || ipToLong(hop) === null) {
      if (!hop.includes(":")) {
        return {
          address: peer,
          proto: url.protocol === "https:" ? "https" : "http",
          host,
          forwardedTrusted: false,
        };
      }
    }
  }

  let client = peer;
  let trustedCount = 0;
  // Rightmost-untrusted walk: start at the rightmost hop (the proxy chain's
  // last entry), skip trusted proxies up to maxHops, return first untrusted.
  for (let i = hops.length - 1; i >= 0; i--) {
    const hop = hops[i]!;
    if (isTrustedAddress(hop, config!) && trustedCount < maxHops) {
      trustedCount += 1;
      client = hop;
      continue;
    }
    client = hop;
    break;
  }

  return {
    address: client,
    // Fail toward SECURE: a claimed http proto can never downgrade an
    // https transport connection to the trusted proxy.
    proto:
      url.protocol === "https:"
        ? "https"
        : parseProto(
              request.headers.get("forwarded"),
              request.headers.get("x-forwarded-proto"),
            ) === "https"
          ? "https"
          : parseProto(
              request.headers.get("forwarded"),
              request.headers.get("x-forwarded-proto"),
            ),
    host:
      request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? host,
    forwardedTrusted: true,
  };
}
