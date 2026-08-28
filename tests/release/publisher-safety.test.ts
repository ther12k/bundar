/**
 * BR-111 publisher safety tests: `publish:approved -- --dry-run` must
 * NEVER invoke `npm publish`, even with BUNDAR_RELEASE_TOKEN set and
 * `npm whoami` succeeding. Proven by running the real script with a fake
 * npm executable on PATH that exits non-zero if the "publish" subcommand
 * is ever requested.
 */
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { withIdentityLock } from "./identity-lock";

const REPO = join(import.meta.dir, "..", "..");
const SCRIPT = join(REPO, "tools", "release", "publish-approved.ts");
const SHIM_BIN = join(REPO, ".tmp-fake-npm-bin");

function writeFakeNpm(): void {
  rmSync(SHIM_BIN, { recursive: true, force: true });
  mkdirSync(SHIM_BIN, { recursive: true });
  const shimPath = join(SHIM_BIN, "npm");
  // Fake npm: `whoami` succeeds; ANY other subcommand (especially
  // "publish") writes a tombstone file and exits 1 loudly.
  writeFileSync(
    shimPath,
    `#!/usr/bin/env bash
set -u
if [[ "$1" == "whoami" ]]; then
  echo "fake-maintainer"
  exit 0
fi
if [[ "$1" == "publish" ]]; then
  echo "FAKE-NPM-TOMBSTONE-PUBLISH-CALLED" >> "${join(SHIM_BIN, "tombstones.txt")}"
  echo "fake npm: publish must never be called" >&2
  exit 99
fi
echo "fake npm: unexpected invocation $*" >&2
exit 97
`,
  );
  chmodSync(shimPath, 0o755);
}

function runPublisher(
  args: readonly string[],
  envOverrides: Record<string, string> = {},
): ReturnType<typeof spawnSync> {
  const pathPrefix = `${SHIM_BIN}:`;
  return spawnSync("bun", [SCRIPT, ...args], {
    cwd: REPO,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PATH: process.env.PATH?.startsWith(pathPrefix)
        ? process.env.PATH
        : `${pathPrefix}${process.env.PATH ?? ""}`,
      BUNDAR_RELEASE_TOKEN: "test-approval-sentinel",
      ...envOverrides,
    },
  });
}

describe("BR-111 publish:approved safety", () => {
  // 30s: may queue behind the Model B rehearsal holding the identity lock on
  // a loaded self-hosted runner (bun default timeout is 5s).
  test("--dry-run verifies candidates and NEVER calls npm publish even when authenticated", async () => {
    if (
      !existsSync(join(REPO, "artifacts", "release", "candidate-manifest.json"))
    ) {
      console.warn(
        "skipping — candidate manifest not present (run publish:dry-run)",
      );
      return;
    }
    await withIdentityLock(async () => {
      writeFakeNpm();
      try {
        const result = runPublisher(["--dry-run"]);
        expect(result.status).toBe(0);
        const output = `${result.stdout ?? ""}`;
        expect(output).toContain("DRY-RUN complete");
        expect(output).toContain("NOTHING was published");
        expect(existsSync(join(SHIM_BIN, "tombstones.txt"))).toBe(false);
      } finally {
        rmSync(SHIM_BIN, { recursive: true, force: true });
      }
    });
  }, 30_000);

  test("--tag latest is rejected without --allow-latest-tag", async () => {
    if (
      !existsSync(join(REPO, "artifacts", "release", "candidate-manifest.json"))
    ) {
      console.warn("skipping — candidate manifest not present");
      return;
    }
    await withIdentityLock(async () => {
      const result = spawnSync("bun", [SCRIPT, "--tag", "latest"], {
        cwd: REPO,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, BUNDAR_RELEASE_TOKEN: undefined },
      });
      expect(result.status).not.toBe(0);
      expect(result.stderr ?? "").toContain("forbidden during pre-1.0");
    });
  }, 30_000);

  test("unknown flags are rejected", () => {
    const result = spawnSync("bun", [SCRIPT, "--definitely-not-a-flag"], {
      cwd: REPO,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    expect(result.status).toBe(2);
    expect(result.stderr ?? "").toContain("unknown argument");
  });

  test("a missing/mismatched manifest aborts before any credential check or build", () => {
    const result = spawnSync(
      "bun",
      [SCRIPT, "--manifest", "/nonexistent/candidate-manifest.json"],
      {
        cwd: REPO,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, BUNDAR_RELEASE_TOKEN: undefined },
      },
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr ?? "").toContain("candidate manifest missing");
  });
});
