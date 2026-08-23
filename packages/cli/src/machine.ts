/**
 * Machine-readable CLI contract (BR-046).
 *
 * One versioned envelope for every agent-facing command, documented exit
 * codes, and guarantees: stable key order (constructors below fix it),
 * no ANSI/control characters in JSON output, and deterministic values
 * except explicitly documented timestamps.
 */

/** Exit codes are a documented contract — never reuse casually. */
export const EXIT = {
  /** Success. */
  ok: 0,
  /** Usage or validation failure (bad flags/args/input). */
  usage: 1,
  /** Environment failure (missing tool, unwritable path, noninteractive prompt required). */
  environment: 2,
  /** Unexpected execution failure (handler threw). */
  execution: 3,
} as const;

export type ExitCode = (typeof EXIT)[keyof typeof EXIT];

/** Removes ANSI escape sequences; JSON output must never contain them. */
export function stripAnsi(value: string): string {
  /* eslint-disable no-control-regex */
  return (
    value
      // OSC sequences (hyperlinks, window titles): ESC ] ... BEL or ESC \
      .replace(/\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g, "")
      // CSI sequences (SGR colors, cursor movement)
      .replace(
        /\u001b\u009b?[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
        "",
      )
  );
}

function clean(value: string): string {
  return stripAnsi(value);
}

export interface CliEnvelopeV1 {
  readonly schema: "bundar.cli/1";
  readonly ok: boolean;
  readonly command: string | null;
  readonly exitCode: ExitCode;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
  readonly data?: unknown;
  readonly next?: readonly string[];
}

export interface EnvelopeInput {
  readonly command: string | null;
  readonly exitCode: ExitCode;
  readonly warnings?: readonly string[];
  readonly errors?: readonly string[];
  readonly data?: unknown;
  readonly next?: readonly string[];
}

/**
 * Builds the v1 envelope with FIXED key order so repeated runs over
 * identical input serialize identically.
 */
export function buildEnvelope(input: EnvelopeInput): CliEnvelopeV1 {
  const ok = input.exitCode === EXIT.ok;
  const base: CliEnvelopeV1 = {
    schema: "bundar.cli/1",
    ok,
    command: input.command,
    exitCode: input.exitCode,
    warnings: (input.warnings ?? []).map(clean),
    errors: (input.errors ?? []).map(clean),
  };
  if (input.data !== undefined) {
    return { ...base, data: input.data, next: input.next ?? [] };
  }
  return { ...base, next: input.next ?? [] };
}

export function printEnvelope(envelope: CliEnvelopeV1): void {
  process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
}
