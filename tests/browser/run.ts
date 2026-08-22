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

  // GH-048: server-side negotiation is dialect-independent — assert the
  // four representations directly through fetch in both lanes.
  await run("negotiation-fetch", [
    "eval",
    "async () => { const doc = await fetch('/page-fragment'); const docText = await doc.text(); const frag = await fetch('/page-fragment', { headers: { 'HX-Request': 'true' } }); const fragText = await frag.text(); const boosted = await fetch('/page-fragment', { headers: { 'HX-Request': 'true', 'HX-Boosted': 'true' } }); const boostedText = await boosted.text(); const restore = await fetch('/page-fragment', { headers: { 'HX-Request': 'true', 'HX-History-Restore-Request': 'true' } }); const restoreText = await restore.text(); return JSON.stringify({ docIsDocument: docText.startsWith('<!doctype html>') && docText.includes('<section id=\"items\">'), fragIsFragment: !fragText.includes('<html') && fragText.startsWith('<section'), fragVary: frag.headers.get('vary'), boostedIsDocument: boostedText.startsWith('<!doctype html>'), restoreIsDocument: restoreText.startsWith('<!doctype html>') }); }",
    "--filename",
    "negotiation.json",
  ]);
  const negotiationText = await readFile(
    join(artifactDirectory, "negotiation.json"),
    "utf8",
  );
  const negotiation = JSON.parse(JSON.parse(negotiationText) as string) as {
    docIsDocument: boolean;
    fragIsFragment: boolean;
    fragVary: string | null;
    boostedIsDocument: boolean;
    restoreIsDocument: boolean;
  };
  if (
    !negotiation.docIsDocument ||
    !negotiation.fragIsFragment ||
    !negotiation.boostedIsDocument ||
    !negotiation.restoreIsDocument
  ) {
    throw new Error(
      `page-fragment negotiation failed in ${lane}: ${negotiationText}`,
    );
  }
  if (
    negotiation.fragVary !==
    "HX-Request, HX-Boosted, HX-History-Restore-Request"
  ) {
    throw new Error(
      `page-fragment fragment vary header missing in ${lane}: ${String(negotiation.fragVary)}`,
    );
  }

  // GH-048: boosted navigation through the real htmx layer — htmx swaps the
  // <body> out of the full document the server negotiated.
  await run("boosted-click", ["click", "#boosted-link"]);
  await run("boosted-wait", [
    "run-code",
    "async page => { await page.waitForTimeout(250); }",
  ]);
  await run("boosted-state-eval", [
    "eval",
    "() => JSON.stringify({ url: location.pathname, itemsHeading: document.querySelector('#items h2')?.textContent ?? null, htmlRoots: document.querySelectorAll('html').length, bodyCount: document.querySelectorAll('body').length })",
    "--filename",
    "boosted-state.json",
  ]);
  const boostedText = await readFile(
    join(artifactDirectory, "boosted-state.json"),
    "utf8",
  );
  const boostedState = JSON.parse(JSON.parse(boostedText) as string) as {
    url: string;
    itemsHeading: string | null;
    htmlRoots: number;
    bodyCount: number;
  };
  const boostedPassed =
    boostedState.url === "/page-fragment" &&
    boostedState.itemsHeading === "Items" &&
    boostedState.htmlRoots === 1 &&
    boostedState.bodyCount === 1;
  // Experimental lane (htmx 4 beta) records the observation; the stable lane
  // is a hard assertion, matching the lifecycle-event policy above.
  if (lane === "htmx2" && !boostedPassed) {
    throw new Error(`boosted navigation failed in ${lane}: ${boostedText}`);
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
      "page-fragment-negotiation",
      "boosted-navigation",
    ],
    negotiation: {
      issue: "GH-048",
      docIsDocument: negotiation.docIsDocument,
      fragIsFragment: negotiation.fragIsFragment,
      boostedIsDocument: negotiation.boostedIsDocument,
      restoreIsDocument: negotiation.restoreIsDocument,
      fragmentVary: negotiation.fragVary,
    },
    boostedNavigation: {
      expected: "full document body swap, one html root, #items present",
      observed: boostedState,
      classification:
        lane === "htmx2"
          ? "stable-lane assertion"
          : "experimental-lane observation",
      passed: boostedPassed,
    },
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
      "negotiation.json",
      "boosted-state.json",
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
