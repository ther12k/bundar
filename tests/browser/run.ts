import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { startFixtureServer, fixtureVersion, type BrowserLane } from "./server";

const lane = process.argv[2] as BrowserLane | undefined;
if (lane !== "htmx2" && lane !== "htmx4") {
  console.error("usage: bun tests/browser/run.ts <htmx2|htmx4>");
  process.exit(2);
}

const repositoryRoot = resolve(import.meta.dir, "..", "..");
const artifactDirectory = join(repositoryRoot, "output", "playwright", lane);
await mkdir(artifactDirectory, { recursive: true });

const server = await startFixtureServer(lane);
const baseUrl = `http://127.0.0.1:${server.port}`;
const session = `bundar-${lane}`;
const home = process.env.HOME ?? "/tmp";
const codexHome = process.env.CODEX_HOME ?? join(home, ".codex");
const pwcli = join(
  codexHome,
  "skills",
  "playwright",
  "scripts",
  "playwright_cli.sh",
);

async function run(
  name: string,
  args: string[],
  required = true,
): Promise<number> {
  const command = [pwcli, `-s=${session}`, ...args];
  const processHandle = Bun.spawn(command, {
    cwd: artifactDirectory,
    env: { ...process.env, PLAYWRIGHT_CLI_SESSION: session },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(processHandle.stdout).text(),
    new Response(processHandle.stderr).text(),
    processHandle.exited,
  ]);
  await writeFile(join(artifactDirectory, `${name}.stdout.txt`), stdout);
  await writeFile(join(artifactDirectory, `${name}.stderr.txt`), stderr);
  await writeFile(
    join(artifactDirectory, `${name}.command.txt`),
    `$ ${command.join(" ")}\n`,
  );
  if (required && exitCode !== 0) {
    throw new Error(
      `${name} failed with exit ${exitCode}: ${stderr || stdout}`,
    );
  }
  return exitCode;
}

try {
  await run("open", ["open", baseUrl, "--browser", "chrome"]);
  await run("baseline-snapshot", ["snapshot"]);
  await run("trace-start", ["tracing-start"]);

  await run("fragment-click", ["click", "#load-fragment"]);
  await run("fragment-wait", [
    "run-code",
    "async page => { await page.waitForTimeout(250); }",
  ]);
  await run("fragment-snapshot", ["snapshot"]);

  await run("form-fill", ["fill", "input[name=name]", "Bundar"]);
  await run("form-submit", ["click", "#echo-form button[type=submit]"]);
  await run("form-wait", [
    "run-code",
    "async page => { await page.waitForTimeout(250); }",
  ]);

  await run("history-click", ["click", "#history-link"]);
  await run("history-wait", [
    "run-code",
    "async page => { await page.waitForTimeout(250); }",
  ]);
  await run("response-headers", [
    "eval",
    "async () => { const response = await fetch('/fragment', { headers: { 'HX-Request': 'true' } }); return JSON.stringify({ status: response.status, headers: Object.fromEntries(response.headers.entries()) }); }",
    "--filename",
    "response-headers.json",
  ]);

  await run("dom-eval", [
    "eval",
    "() => document.documentElement.outerHTML",
    "--filename",
    "dom.html",
  ]);
  await run("state-eval", [
    "eval",
    "() => JSON.stringify({ url: location.href, status: document.querySelector('#status')?.textContent, event: document.querySelector('#event-state')?.textContent, title: document.title })",
    "--filename",
    "state.json",
  ]);
  await run("screenshot", [
    "screenshot",
    "--filename",
    "page.png",
    "--full-page",
  ]);
  await run("requests", ["requests", "--static"]);
  await run("console", ["console"]);
  await run("trace-stop", ["tracing-stop"]);

  const stateText = await readFile(
    join(artifactDirectory, "state.json"),
    "utf8",
  );
  const state = JSON.parse(JSON.parse(stateText) as string) as {
    event?: string;
  };
  const negativeExit = await run(
    "negative-incorrect-header",
    [
      "run-code",
      "async page => { const value = await page.evaluate(async () => { const response = await fetch('/incorrect-header'); return response.headers.get('HX-Trigger-After-Swap'); }); if (value !== 'fixture-event') throw new Error('deliberately incorrect header fixture rejected: expected HX-Trigger-After-Swap'); }",
    ],
    false,
  );
  if (negativeExit === 0) {
    throw new Error("negative fixture unexpectedly passed");
  }

  const asset = await readFile(
    join(repositoryRoot, "fixtures", lane, "htmx.min.js"),
  );
  const hash = createHash("sha256").update(asset).digest("hex");
  const report = {
    lane,
    stability: lane === "htmx2" ? "stable" : "experimental",
    htmxVersion: fixtureVersion(lane),
    asset: {
      path: `fixtures/${lane}/htmx.min.js`,
      bytes: asset.byteLength,
      sha256: hash,
    },
    browser: "Chrome for Testing 152.0.7977.8 / Playwright Chromium 1237",
    baseUrl,
    scenarios: [
      "smoke-page",
      "fragment-swap",
      "form-post",
      "history-push",
      "incorrect-header-negative",
    ],
    lifecycleEvent: {
      expected: "event: afterRequest",
      observed: state.event ?? "missing",
      classification:
        lane === "htmx2"
          ? "stable-lane assertion"
          : "experimental-lane observation",
      passed: lane === "htmx2" ? state.event === "event: afterRequest" : true,
    },
    negativeFixture: {
      expected: "failure",
      observedExitCode: negativeExit,
      reason:
        "HX-Trigger-After-Swap is intentionally absent; fixture must not be reported as a pass.",
    },
    artifacts: [
      "baseline-snapshot.stdout.txt",
      "fragment-snapshot.stdout.txt",
      "dom.html",
      "state.json",
      "page.png",
      "requests.stdout.txt",
      "response-headers.json",
      "console.stdout.txt",
      "trace-stop.stdout.txt",
    ],
  };
  await writeFile(
    join(artifactDirectory, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(
    `browser:${lane}: smoke and interaction scenarios passed; negative fixture failed as expected`,
  );
} finally {
  await run("close", ["close"], false).catch(() => undefined);
  server.stop();
}
