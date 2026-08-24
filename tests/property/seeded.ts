/**
 * Deterministic seeded property-testing harness (BR-068).
 *
 * mulberry32 PRNG: tiny, fast, reproducible. Every failure prints the seed
 * AND case index so a failing run replays exactly:
 *
 *   reproduce with: SEED=<printed> bun test <file>
 */

export interface Rng {
  /** Uniform float [0,1). */
  readonly next: () => number;
  /** Uniform integer [0, max). */
  int(max: number): number;
  /** Picks a random element (assumes non-empty). */
  pick<T>(items: readonly T[]): T;
  /** Random string from the given alphabet. */
  string(alphabet: string, length: number): string;
  /** True with probability p (0..1). */
  chance(p: number): boolean;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (max) => Math.floor(next() * max),
    pick: (items) => items[Math.floor(next() * items.length)]!,
    string: (alphabet, length) => {
      let out = "";
      for (let i = 0; i < length; i++)
        out += alphabet[Math.floor(next() * alphabet.length)];
      return out;
    },
    chance: (p) => next() < p,
  };
}

export interface PropertyOptions {
  /** Base seed; CI uses this exact value (deterministic). */
  readonly seed?: number;
  /** Number of cases (default 200; fuzz lanes raise it). */
  readonly runs?: number;
}

export const CI_DEFAULT_SEED = 0x5eed;

/**
 * Runs a property `runs` times with one seeded RNG. On the first failure,
 * rethrows with seed+case context appended so the case replays exactly.
 */
export async function property(
  name: string,
  options: PropertyOptions,
  fn: (rng: Rng, caseIndex: number) => void | Promise<void>,
): Promise<void> {
  const seed = options.seed ?? CI_DEFAULT_SEED;
  const runs = options.runs ?? 200;
  const rng = createRng(seed);
  for (let caseIndex = 0; caseIndex < runs; caseIndex++) {
    try {
      await fn(rng, caseIndex);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `[property] "${name}" FAILED at seed=${seed} case=${caseIndex}: ${detail}`,
        { cause: error },
      );
    }
  }
}

/** Resolves how many runs the current lane allows. */
export function fuzzRuns(defaultRuns: number): number {
  return process.env.BUNDAR_FUZZ_LONG === "1"
    ? Math.max(defaultRuns * 10, 5000)
    : defaultRuns;
}

/** Shared hostile alphabets for generators. */
export const ALPHABETS = {
  urlSafe: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~",
  percent: "%0123456789abcdefABCDEF",
  crlf: "\r\n",
  controls: "\u0000\u0001\u001f\u007f\u0080\u009f",
  schemes: ["javascript:", "data:", "vbscript:", "https://", "http://", "//"],
  traversal: ["../", "..\\", "%2e%2e%2f", "%252e%252e"],
} as const;
