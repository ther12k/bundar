/**
 * Bun test discovery does not match `.test-d.ts` filenames, so this wrapper
 * re-registers the invalidField type tests for every normal `bun test` run.
 * The compile-time assertions remain enforced by `tsc --noEmit` (same
 * pattern as core's route-descriptor tests).
 */
import "./invalid-field.test-d";
