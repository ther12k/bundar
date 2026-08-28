/**
 * Cross-file mutex for release tests that either mutate package-affecting
 * source or spawn the publisher/verifier, which re-read the real worktree
 * via candidateSourceIdentity. Bun test runs test files concurrently; on a
 * loaded runner (self-hosted CI shares vCPUs with browser lanes) the
 * mutation window otherwise races the publisher's identity check and fails
 * it spuriously.
 */
import {
  closeSync,
  existsSync,
  openSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const LOCK = join(tmpdir(), "bundar-release-identity.lock");
const STALE_MS = 120_000;

export async function withIdentityLock<T>(
  fn: () => T | Promise<T>,
): Promise<T> {
  let fd: number | undefined;
  while (fd === undefined) {
    try {
      fd = openSync(LOCK, "wx");
    } catch {
      // A crashed runner can leave the lock behind; break locks older than
      // the staleness window, otherwise wait for the holder.
      if (existsSync(LOCK) && Date.now() - statSync(LOCK).mtimeMs > STALE_MS) {
        unlinkSync(LOCK);
        continue;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  try {
    writeFileSync(fd, String(process.pid));
    return await fn();
  } finally {
    closeSync(fd);
    unlinkSync(LOCK);
  }
}
