/**
 * Minimal compile-time assertion helpers for type tests. Assertions using
 * these are enforced by `tsc --noEmit`; they have no runtime behavior.
 * (Local mirror of core's test type utilities — packages do not reach into
 * each other's test trees.)
 */

/** Deep type equality (the classic strict conditional comparison). */
export type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
    ? true
    : false;

/** Resolves only when the argument is exactly `true`. */
export type Expect<T extends true> = T;
