/**
 * test:example (GH-076): the Todo reference app verified end to end over
 * real HTTP in three lanes from ONE source tree:
 *
 * - `todo:htmx2`  — stable dialect bootstrap; PRG + enhanced flows
 * - `todo:htmx4`  — temporary mount whose ONLY change is src/dialect.ts
 *                   (experimental adapter); identical flows must pass
 * - `todo:no-js`  — every request plain (zero HTMX headers): create,
 *                   toggle, edit, delete, filters, counts via PRG alone
 *
 * Usage: bun run test:example -- todo:htmx2 | todo:htmx4 | todo:no-js
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
const VARIANTS = ["todo:htmx2", "todo:htmx4", "todo:no-js"] as const;
if (!VARIANTS.includes(variant as (typeof VARIANTS)[number])) {
  console.error(`test:example: pass one of ${VARIANTS.join(" | ")}`);
  process.exit(2);
}

const REPO = join(import.meta.dir, "..");
const TODO = join(REPO, "examples", "todo");
const TEMP_MOUNT = join(REPO, "examples", "todo-verify-tmp");
const LOCKFILE = join(REPO, "bun.lock");
const LOCK_BACKUP = join(tmpdir(), `bun-lock-backup-${Date.now()}`);

const HTMX4_DIALECT = `/**
 * The ONE dialect decision (bootstrap-time only).
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
  console.log(`[example:${variant}] ${label}: ${command} ${args.join(" ")}`);
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
  let target = TODO;
  let port = 3811;

  if (variant === "todo:htmx4") {
    if (existsSync(TEMP_MOUNT)) throw new Error(`${TEMP_MOUNT} already exists`);
    cpSync(TODO, TEMP_MOUNT, { recursive: true });
    writeFileSync(join(TEMP_MOUNT, "src", "dialect.ts"), HTMX4_DIALECT);
    const pkg = JSON.parse(
      readFileSync(join(TEMP_MOUNT, "package.json"), "utf8"),
    );
    pkg.name = "@bundar/example-todo-htmx4-verify";
    writeFileSync(
      join(TEMP_MOUNT, "package.json"),
      JSON.stringify(pkg, null, 2) + "\n",
    );
    target = TEMP_MOUNT;
    port = 3812;
    // the ONLY difference between variants is dialect.ts
    const diff = spawnSync(
      "diff",
      [
        "-r",
        TODO,
        TEMP_MOUNT,
        "-x",
        "node_modules",
        "-x",
        "dist",
        "-x",
        "package.json",
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
      `[example:${variant}] variant delta confirmed: src/dialect.ts only`,
    );
    run("install", "bun", ["install"], REPO);
  }

  // unit suite of the target tree first
  run("unit-tests", "bun", ["test", "src"], target);

  // START the production entry
  const child = Bun.spawn([process.execPath, "src/main.ts"], {
    cwd: target,
    env: { ...process.env, PORT: String(port) },
    stdout: "pipe",
    stderr: "inherit",
  });
  const base = `http://127.0.0.1:${port}`;
  const jar = new Map<string, string>();

  const call = async (
    path: string,
    init: RequestInit = {},
  ): Promise<Response> => {
    const cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    const response = await fetch(`${base}${path}`, {
      ...init,
      redirect: "manual",
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    for (const setCookie of response.headers.getSetCookie()) {
      const pair = setCookie.split(";")[0] ?? "";
      const eq = pair.indexOf("=");
      jar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
    return response;
  };
  const tokenOf = async (): Promise<string> => {
    const html = await (await call("/")).text();
    return html.match(/name="_csrf"[^>]*value="([^"]*)"/)?.[1] ?? "";
  };
  const post = (
    path: string,
    fields: Record<string, string>,
    enhanced = false,
  ) =>
    call(path, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: base,
        ...(enhanced
          ? { "hx-request": "true", "hx-target": "#todo-list" }
          : {}),
      },
      body: new URLSearchParams(fields).toString(),
    });

  let up = false;
  for (let attempt = 0; attempt < 50 && !up; attempt += 1) {
    try {
      up = (await call("/")).ok;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  if (!up) {
    child.kill();
    throw new Error("server never became healthy");
  }

  const expect = (condition: boolean, message: string): void => {
    if (!condition) {
      child.kill();
      throw new Error(`assertion failed: ${message}`);
    }
  };

  const noJs = variant === "todo:no-js";

  // 1. list renders seed + counts
  const home = await (await call("/")).text();
  expect(
    home.includes('id="todo-counts"') && home.includes("2 total"),
    "counts region",
  );
  expect(home.includes('id="filters"'), "filter links");

  // 2. create (PRG in no-JS lane; fragment+OOB in enhanced lanes)
  const token = await tokenOf();
  const created = await post(
    "/todos",
    { _csrf: token, title: "E2E task" },
    !noJs,
  );
  if (noJs) {
    expect(
      created.status === 303,
      `no-JS create is PRG (got ${created.status})`,
    );
  } else {
    expect(
      created.status === 200,
      `enhanced create is 200 (got ${created.status})`,
    );
    const body = await created.text();
    expect(body.includes('id="todo-3"'), "enhanced create item");
    expect(
      body.includes('id="todo-counts"') && body.includes("3 total"),
      "OOB counts intent",
    );
    expect(!body.includes("<html"), "enhanced response is a fragment");
  }

  // 3. toggle (fresh token — success rotated the last one)
  const toggleToken = await tokenOf();
  const toggled = await post("/todos/3/toggle", { _csrf: toggleToken }, !noJs);
  expect([200, 303].includes(toggled.status), "toggle accepted");
  const doneList = await (await call("/?filter=done")).text();
  expect(
    doneList.includes('id="todo-3"'),
    "filter=done shows the toggled item",
  );

  // 4. edit via PRG
  const editToken = await tokenOf();
  const edited = await post(
    "/todos/3/edit",
    { _csrf: editToken, title: "E2E renamed" },
    !noJs,
  );
  expect([200, 303].includes(edited.status), "edit accepted");
  expect(
    (await (await call("/")).text()).includes("E2E renamed"),
    "renamed title visible",
  );

  // 5. delete (fresh token) + flash + counts arithmetic
  const deleteToken = await tokenOf();
  const deleted = await post("/todos/3/delete", { _csrf: deleteToken }, !noJs);
  expect([200, 303].includes(deleted.status), "delete accepted");
  const after = await (await call("/")).text();
  expect(!after.includes('id="todo-3"'), "row gone");
  expect(after.includes("2 total"), "counts back to 2");
  expect(after.includes("Deleted"), "flash rendered");

  // 6. validation + unknown id fail safe
  const invalidToken = await tokenOf();
  const invalid = await post("/todos", { _csrf: invalidToken, title: "x" });
  expect(
    invalid.status === 422,
    `invalid title is 422 (got ${invalid.status})`,
  );
  const missingToken = await tokenOf();
  const missing = await post("/todos/999/delete", { _csrf: missingToken });
  expect(missing.status === 404, `unknown id is 404 (got ${missing.status})`);

  // 7. CSRF fail-closed: tokenless mutation
  const tokenless = await post("/todos", { title: "Nope" });
  expect(
    tokenless.status === 403,
    `tokenless mutation is 403 (got ${tokenless.status})`,
  );

  child.kill();
  await child.exited;
  console.log(`[example:${variant}] ALL CHECKS PASSED`);
} catch (error) {
  console.error(`[example:${variant}] FAILED: ${(error as Error).message}`);
  process.exitCode = 1;
} finally {
  cleanup();
}
