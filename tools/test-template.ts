/**
 * test:template (GH-075): verify the canonical minimal starter in both
 * dialect variants — install → typecheck → test → build → START with
 * live HTTP assertions.
 *
 * - `minimal-htmx2`: the checked-in template in place (a workspace
 *   member so its `workspace:*` dependencies resolve pre-npm).
 * - `minimal-htmx4`: a temporary copy under examples/ whose ONLY change
 *   is src/dialect.ts (the experimental adapter) — proving that switching
 *   adapters touches bootstrap configuration alone. bun.lock is
 *   snapshotted and restored byte-for-byte afterward.
 *
 * Usage: bun run test:template -- minimal-htmx2 | minimal-htmx4
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const variant = process.argv[2];
if (variant !== "minimal-htmx2" && variant !== "minimal-htmx4") {
  console.error("test:template: pass minimal-htmx2 or minimal-htmx4");
  process.exit(2);
}

const REPO = join(import.meta.dir, "..");
const TEMPLATE = join(REPO, "templates", "minimal");
const TEMP_MOUNT = join(REPO, "examples", "template-verify-tmp");
const LOCKFILE = join(REPO, "bun.lock");
const LOCK_BACKUP = join(tmpdir(), `bun-lock-backup-${Date.now()}`);

const HTMX4_DIALECT = `/**
 * The ONE dialect decision in this application — bootstrap-time only.
 * EXPERIMENTAL: htmx 4.0.0-beta6 — beta software, no GA compatibility
 * claim. Data per docs/compatibility/htmx4-beta6.md.
 */
import { htmx4Experimental } from "@bundar/htmx/4";

export const dialect = htmx4Experimental;
`;

function run(
  label: string,
  command: string,
  args: readonly string[],
  cwd: string,
): void {
  console.log(`[template:${variant}] ${label}: ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit ${result.status ?? 1}`);
  }
}

function cleanup(): void {
  rmSync(TEMP_MOUNT, { recursive: true, force: true });
  if (existsSync(LOCK_BACKUP)) {
    copyFileSync(LOCK_BACKUP, LOCKFILE);
    rmSync(LOCK_BACKUP);
  }
  spawnSync("bun", ["install", "--frozen-lockfile"], {
    cwd: REPO,
    stdio: "ignore",
  });
}

copyFileSync(LOCKFILE, LOCK_BACKUP);

try {
  let target = TEMPLATE;
  let port = 3801;

  if (variant === "minimal-htmx4") {
    if (existsSync(TEMP_MOUNT)) throw new Error(`${TEMP_MOUNT} already exists`);
    cpSync(TEMPLATE, TEMP_MOUNT, { recursive: true });
    writeFileSync(join(TEMP_MOUNT, "src", "dialect.ts"), HTMX4_DIALECT);
    // distinct workspace name for the temporary mount (same sources)
    const pkg = JSON.parse(
      readFileSync(join(TEMP_MOUNT, "package.json"), "utf8"),
    );
    pkg.name = "bundar-minimal-starter-htmx4-verify";
    writeFileSync(
      join(TEMP_MOUNT, "package.json"),
      JSON.stringify(pkg, null, 2) + "\n",
    );
    target = TEMP_MOUNT;
    port = 3802;
    // the ONLY difference between variants is dialect.ts
    const diff = spawnSync(
      "diff",
      [
        "-r",
        TEMPLATE,
        TEMP_MOUNT,
        "-x",
        "node_modules",
        "-x",
        "dist",
        "-x",
        "package.json", // renamed by this harness for the temporary mount
      ],
      { encoding: "utf8" },
    );
    const changed = (diff.stdout ?? "")
      .split("\n")
      .filter((line) => line.startsWith("Only in") || line.includes("diff -r"))
      .filter((line) => !line.includes("dialect.ts"));
    if (changed.length > 0) {
      throw new Error(
        `variant differs beyond dialect.ts: ${changed.join("; ")}`,
      );
    }
    console.log(
      `[template:${variant}] variant delta confirmed: src/dialect.ts only`,
    );
    run("install", "bun", ["install"], REPO);
  }

  run("typecheck", "bunx", ["tsc", "--noEmit"], target);
  run("test", "bun", ["test"], target);
  run("build", "bun", ["run", "build"], target);

  // START the built-for-production entry and assert over HTTP
  const child = Bun.spawn([process.execPath, "src/main.ts"], {
    cwd: target,
    env: { ...process.env, PORT: String(port) },
    stdout: "pipe",
    stderr: "inherit",
  });
  const base = `http://127.0.0.1:${port}`;
  let up = false;
  for (let attempt = 0; attempt < 50 && !up; attempt += 1) {
    try {
      up = (await fetch(`${base}/healthz`)).ok;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  if (!up) {
    child.kill();
    throw new Error(`server never became healthy on ${base}`);
  }

  const expect = (condition: boolean, message: string): void => {
    if (!condition) {
      child.kill();
      throw new Error(`assertion failed: ${message}`);
    }
  };

  const health = await fetch(`${base}/healthz`);
  expect(health.status === 200 && (await health.text()) === "ok", "healthz");

  const home = await fetch(`${base}/`);
  const homeHtml = await home.text();
  expect(home.status === 200, "home status");
  expect(
    homeHtml.includes("<html") && homeHtml.includes('id="subscribe-form"'),
    "home document with form",
  );
  expect(
    (await fetch(`${base}/assets/htmx.js`)).status === 200,
    "local htmx asset",
  );

  const noJs = await fetch(`${base}/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "email=nojs@example.com",
    redirect: "manual",
  });
  expect(
    noJs.status === 303 && noJs.headers.get("location") === "/",
    "no-JS PRG",
  );

  const enhanced = await fetch(`${base}/subscribe`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "hx-request": "true",
    },
    body: "email=htmx@example.com",
  });
  const enhancedBody = await enhanced.text();
  expect(
    enhanced.status === 200 &&
      enhancedBody.includes("Subscribed: htmx@example.com"),
    "enhanced fragment",
  );
  expect(!enhancedBody.includes("<html"), "fragment has no document skeleton");

  const invalid = await fetch(`${base}/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "email=bad",
    redirect: "manual",
  });
  const invalidBody = await invalid.text();
  expect(
    invalid.status === 422 &&
      invalidBody.includes("Enter a valid email address"),
    "422 with error region",
  );

  child.kill();
  await child.exited;
  console.log(`[template:${variant}] ALL CHECKS PASSED`);
} catch (error) {
  console.error(`[template:${variant}] FAILED: ${(error as Error).message}`);
  process.exitCode = 1;
} finally {
  cleanup();
}
