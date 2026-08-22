/**
 * test:scaffold (GH-071): generate a project with create-bundar and prove
 * it installs, typechecks, tests, builds, and RUNS — exercising health,
 * the home document, the no-JS PRG form flow, and the enhanced fragment
 * flow over real HTTP — then cleans up and restores the lockfile.
 *
 * Tooling decision (documented in evidence/gh-071): @bundar packages are
 * not yet on the npm registry (publication is M6, GH-086). The generated
 * project declares `workspace:*` dependencies, so verification mounts it
 * temporarily inside this monorepo's `examples/*` workspace glob. The
 * bun.lock is snapshotted and restored byte-for-byte afterward.
 *
 * Usage: bun run test:scaffold -- htmx2 | htmx4-experimental
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createProject,
  type ScaffoldDialect,
} from "../create-bundar/src/index";

const dialectArg = process.argv[2];
if (dialectArg !== "htmx2" && dialectArg !== "htmx4-experimental") {
  console.error("test:scaffold: pass htmx2 or htmx4-experimental");
  process.exit(2);
}
const dialect: ScaffoldDialect = dialectArg;

const REPO = join(import.meta.dir, "..");
const SCAFFOLD_DIR = join(REPO, "examples", "scaffold-verify-tmp");
const LOCKFILE = join(REPO, "bun.lock");
const LOCK_BACKUP = join(tmpdir(), `bun-lock-backup-${Date.now()}`);

function run(
  label: string,
  command: string,
  args: readonly string[],
  cwd: string,
): void {
  console.log(`[scaffold:${dialect}] ${label}: ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit ${result.status ?? 1}`);
  }
}

function cleanup(): void {
  rmSync(SCAFFOLD_DIR, { recursive: true, force: true });
  if (existsSync(LOCK_BACKUP)) {
    copyFileSync(LOCK_BACKUP, LOCKFILE);
    rmSync(LOCK_BACKUP);
  }
  // re-sync node_modules with the restored lockfile
  spawnSync("bun", ["install", "--frozen-lockfile"], {
    cwd: REPO,
    stdio: "ignore",
  });
}

if (existsSync(SCAFFOLD_DIR)) {
  console.error(`[scaffold] ${SCAFFOLD_DIR} already exists; refusing`);
  process.exit(1);
}
copyFileSync(LOCKFILE, LOCK_BACKUP);

try {
  // 1. generate
  const result = createProject({
    target: SCAFFOLD_DIR,
    dialect,
    name: "scaffold-verify-tmp",
  });
  console.log(`[scaffold:${dialect}] generated ${result.files.length} files`);

  // 2. install (workspace member; lockfile restored after)
  run("install", "bun", ["install"], REPO);

  // 3. typecheck / test / build in the GENERATED project
  run("typecheck", "bunx", ["tsc", "--noEmit"], SCAFFOLD_DIR);
  run("test", "bun", ["test"], SCAFFOLD_DIR);
  run("build", "bun", ["run", "build"], SCAFFOLD_DIR);

  // 4. run the production entry (detached) and exercise it over HTTP
  const port = 3789 + (dialect === "htmx4-experimental" ? 1 : 0);
  const child = Bun.spawn([process.execPath, "src/main.ts"], {
    cwd: SCAFFOLD_DIR,
    env: { ...process.env, PORT: String(port) },
    stdout: "pipe",
    stderr: "inherit",
  });
  const base = `http://127.0.0.1:${port}`;
  const readChildOutput = async () => {
    const reader = child.stdout.getReader();
    const { value } = await reader.read();
    return new TextDecoder().decode(value ?? new Uint8Array());
  };

  let up = false;
  for (let attempt = 0; attempt < 50 && !up; attempt += 1) {
    try {
      const probe = await fetch(`${base}/healthz`);
      up = probe.ok;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  if (!up) {
    child.kill();
    throw new Error(`server never became healthy on ${base}`);
  }
  const startupLine = await readChildOutput();
  console.log(`[scaffold:${dialect}] server: ${startupLine.trim()}`);

  const expect = (condition: boolean, message: string): void => {
    if (!condition) {
      child.kill();
      throw new Error(`assertion failed: ${message}`);
    }
  };

  // health
  const health = await fetch(`${base}/healthz`);
  expect(health.status === 200, "healthz status");
  expect((await health.text()) === "ok", "healthz body");

  // home renders a document with the form
  const home = await fetch(`${base}/`);
  const homeHtml = await home.text();
  expect(home.status === 200, "home status");
  expect(homeHtml.includes("<html"), "home is a document");
  expect(homeHtml.includes('id="subscribe-form"'), "home contains the form");

  // the local htmx asset serves (no CDN)
  const asset = await fetch(`${base}/assets/htmx.js`);
  expect(asset.status === 200, "local htmx asset serves");

  // no-JS form flow: Post/Redirect/Get
  const noJs = await fetch(`${base}/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "email=nojs@example.com",
    redirect: "manual",
  });
  expect(noJs.status === 303, `no-JS submit is PRG 303 (got ${noJs.status})`);
  expect(noJs.headers.get("location") === "/?subscribed=1", "PRG location");

  // enhanced form flow: fragment, no redirect
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
    enhanced.status === 200,
    `enhanced submit is 200 (got ${enhanced.status})`,
  );
  expect(
    enhancedBody.includes("Subscribed: htmx@example.com"),
    "enhanced fragment body",
  );
  expect(!enhancedBody.includes("<html"), "enhanced response is a fragment");

  // invalid input fails safe (422) in both worlds
  const invalid = await fetch(`${base}/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "email=not-an-email",
    redirect: "manual",
  });
  expect(
    invalid.status === 422,
    `invalid submit is 422 (got ${invalid.status})`,
  );

  child.kill();
  await child.exited;
  console.log(`[scaffold:${dialect}] ALL CHECKS PASSED`);
} catch (error) {
  console.error(`[scaffold:${dialect}] FAILED: ${(error as Error).message}`);
  process.exitCode = 1;
} finally {
  cleanup();
}
