/**
 * Bun test discovery does not match `.test-d.ts` filenames, so this wrapper
 * re-registers the route descriptor model tests for every normal `bun test`
 * run. The type-level assertions remain enforced by `tsc --noEmit`.
 */
import "./route-descriptor.test-d";
