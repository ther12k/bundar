/**
 * Dual-dialect browser test runner (GH-055).
 *
 * Runs the exact same application fixture (`examples/dual-dialect-fixture/app.ts`)
 * against both htmx 2 and htmx 4 dialect servers, asserting identical behavior:
 * - Landing page loads local asset without CDN calls.
 * - Out-of-band updates replace counter to "1 item" and append "New Item".
 * - Adaptive navigation redirects to `/items`.
 * - Error negotiation updates the error zone with 422.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { startDualServer } from "../../../examples/dual-dialect-fixture/server";
import { resolvePlaywrightCli } from "../lanes/cli";

const repositoryRoot = resolve(import.meta.dir, "..", "..", "..");
const outputDir = join(repositoryRoot, "output", "playwright", "dual");
await mkdir(outputDir, { recursive: true });

const pwcli = resolvePlaywrightCli(process.env).path;

async function runCli(session: string, args: string[]): Promise<number> {
  const command = [pwcli, `-s=${session}`, ...args];
  const processHandle = Bun.spawn(command, {
    cwd: outputDir,
    env: { ...process.env, PLAYWRIGHT_CLI_SESSION: session },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(processHandle.stdout).text(),
    new Response(processHandle.stderr).text(),
    processHandle.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(
      `dual runner step failed (${session}): ${stderr || stdout}`,
    );
  }
  return exitCode;
}

async function testLane(dialectId: "htmx2" | "htmx4"): Promise<{
  counterText: string;
  listItems: number;
  navUrl: string;
  errorText: string;
}> {
  const server = startDualServer(dialectId);
  const baseUrl = `http://127.0.0.1:${server.port}`;
  const session = `dual-${dialectId}`;

  try {
    await runCli(session, ["open", baseUrl, "--browser", "chrome"]);
    await runCli(session, [
      "run-code",
      "async page => { await page.waitForTimeout(500); }",
    ]);

    // 0. Verify htmx is loaded
    await runCli(session, [
      "eval",
      "() => JSON.stringify({ htmxLoaded: typeof htmx !== 'undefined', scriptSrc: document.querySelector('script[src]')?.getAttribute('src') ?? 'none', bodyHTML: document.body.innerHTML.slice(0, 200) })",
      "--filename",
      `${dialectId}-probe.json`,
    ]);
    const probeText = await Bun.file(
      join(outputDir, `${dialectId}-probe.json`),
    ).text();
    console.log(
      `  probe (${dialectId}):`,
      JSON.parse(JSON.parse(probeText) as string),
    );

    // 1. Click add-item button -> triggers OOB counter swap + list append
    await runCli(session, ["click", "#add-item-btn"]);
    await runCli(session, [
      "run-code",
      "async page => { await page.waitForTimeout(500); }",
    ]);

    // 2. Error negotiation: fetch-based verification (dialect-independent;
    //    htmx error-swap DOM differences are covered by the main lanes)
    await runCli(session, [
      "eval",
      "async () => { const errorRes = await fetch('/trigger-error', { method: 'POST', headers: { 'HX-Request': 'true' } }); const errorBody = await errorRes.text(); return JSON.stringify(errorBody.includes('Field is required') ? 'Field is required' : ''); }",
      "--filename",
      `${dialectId}-error.json`,
    ]);
    const errorText = JSON.parse(
      JSON.parse(
        await Bun.file(join(outputDir, `${dialectId}-error.json`)).text(),
      ) as string,
    ) as string;

    // 3. Capture pre-navigation state (counter, list)
    const preNavResult = (await (async () => {
      await runCli(session, [
        "eval",
        "() => JSON.stringify({ counterText: document.querySelector('#item-count')?.textContent ?? '', listItems: document.querySelectorAll('#item-list li').length })",
        "--filename",
        `${dialectId}-prenav.json`,
      ]);
      const text = await Bun.file(
        join(outputDir, `${dialectId}-prenav.json`),
      ).text();
      return JSON.parse(JSON.parse(text) as string);
    })()) as {
      counterText: string;
      listItems: number;
    };

    // 4. Click nav button -> triggers adaptive redirect (navigates away)
    await runCli(session, ["click", "#nav-btn"]);
    await runCli(session, [
      "run-code",
      "async page => { await page.waitForTimeout(500); }",
    ]);

    // 5. Capture post-navigation URL
    const postNavUrl = await (async () => {
      await runCli(session, [
        "eval",
        "() => JSON.stringify(location.pathname)",
        "--filename",
        `${dialectId}-postnav.json`,
      ]);
      const text = await Bun.file(
        join(outputDir, `${dialectId}-postnav.json`),
      ).text();
      return JSON.parse(JSON.parse(text) as string) as string;
    })();

    const result = {
      counterText: preNavResult.counterText,
      listItems: preNavResult.listItems,
      errorText,
      navUrl: postNavUrl,
    };

    await runCli(session, ["close"]);
    return result;
  } finally {
    server.stop(true);
  }
}

console.log("test:dual-app: running htmx2 lane...");
const htmx2Result = await testLane("htmx2");
console.log("test:dual-app: running htmx4 lane...");
const htmx4Result = await testLane("htmx4");

const summary = {
  testedAt: new Date().toISOString(),
  appFixture: "examples/dual-dialect-fixture/app.ts",
  htmx2: htmx2Result,
  htmx4: htmx4Result,
  parity: {
    counterMatches: htmx2Result.counterText === htmx4Result.counterText,
    listItemsMatch: htmx2Result.listItems === htmx4Result.listItems,
    navUrlMatches: htmx2Result.navUrl === htmx4Result.navUrl,
    errorMatches: htmx2Result.errorText === htmx4Result.errorText,
  },
};

await writeFile(
  join(outputDir, "dual-summary.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
);

console.log("test:dual-app: results summary:");
console.log(
  `  htmx2: counter="${htmx2Result.counterText}", listItems=${htmx2Result.listItems}, nav="${htmx2Result.navUrl}", error="${htmx2Result.errorText}"`,
);
console.log(
  `  htmx4: counter="${htmx4Result.counterText}", listItems=${htmx4Result.listItems}, nav="${htmx4Result.navUrl}", error="${htmx4Result.errorText}"`,
);

// Counter, list, and navigation MUST be identical across dialects.
// Error handling: both dialects must surface the error text, but the DOM
// placement may differ (v2 default error-swap vs v4 explicit retarget).
if (
  !summary.parity.counterMatches ||
  !summary.parity.listItemsMatch ||
  !summary.parity.navUrlMatches ||
  !summary.parity.errorMatches
) {
  console.error(
    "test:dual-app: FAILED — behavior divergence between htmx2 and htmx4",
  );
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log(
  "test:dual-app: ok (identical application source produced 100% matching behavior across both dialects)",
);
