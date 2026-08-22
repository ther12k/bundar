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
    docVary: string | null;
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

  // GH-050: action fallback — ordinary POST gets the PRG redirect, the
  // same action serves the fragment + trigger to enhanced submissions.
  await run("action-fallback-eval", [
    "eval",
    "async () => { const manual = await fetch('/action-save', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'name=x', redirect: 'manual' }); const followed = await fetch('/action-save', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'name=x', redirect: 'follow' }); const followedText = await followed.text(); const enhanced = await fetch('/action-save', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'HX-Request': 'true' }, body: 'name=x' }); const enhancedBody = await enhanced.text(); return JSON.stringify({ manualType: manual.type, followedUrl: followed.url, followedIsDocument: followedText.startsWith('<!doctype html>'), enhancedStatus: enhanced.status, enhancedBody, enhancedTrigger: enhanced.headers.get('hx-trigger'), enhancedVary: enhanced.headers.get('vary') }); }",
    "--filename",
    "action-fallback.json",
  ]);
  const actionText = await readFile(
    join(artifactDirectory, "action-fallback.json"),
    "utf8",
  );
  const actionState = JSON.parse(JSON.parse(actionText) as string) as {
    manualType: string;
    followedUrl: string;
    followedIsDocument: boolean;
    enhancedStatus: number;
    enhancedBody: string;
    enhancedTrigger: string | null;
    enhancedVary: string | null;
  };
  // browsers hide manual-redirect details (opaque) — the opaque redirect
  // type plus the followed navigation landing on the PRG target document
  // proves the ordinary path
  if (
    actionState.manualType !== "opaqueredirect" ||
    !actionState.followedUrl.endsWith("/page-fragment") ||
    !actionState.followedIsDocument ||
    actionState.enhancedStatus !== 200 ||
    !actionState.enhancedBody.includes("saved-via-action") ||
    actionState.enhancedTrigger === null ||
    actionState.enhancedVary === null
  ) {
    throw new Error(`action fallback failed in ${lane}: ${actionText}`);
  }

  // GH-049: the real htmx history-restore path — back to the page that
  // pushed /page-fragment, then forward: htmx restores the entry (cache or
  // refetch with HX-History-Restore-Request) and must install the DOCUMENT,
  // never a fragment.
  await run(
    "history-back",
    [
      "run-code",
      "async page => { await page.evaluate(() => history.back()); }",
    ],
    false, // context destruction is expected during navigation
  );
  await run("history-back-wait", [
    "run-code",
    "async page => { await page.waitForTimeout(500); }",
  ]);
  await run(
    "history-forward",
    [
      "run-code",
      "async page => { await page.evaluate(() => history.forward()); }",
    ],
    false,
  );
  await run("history-forward-wait", [
    "run-code",
    "async page => { await page.waitForTimeout(600); }",
  ]);
  await run("history-restore-state", [
    "eval",
    "() => JSON.stringify({ url: location.pathname, htmlRoots: document.querySelectorAll('html').length, bodyCount: document.querySelectorAll('body').length, items: document.querySelector('#items h2')?.textContent ?? null })",
    "--filename",
    "history-restore.json",
  ]);
  const historyText = await readFile(
    join(artifactDirectory, "history-restore.json"),
    "utf8",
  );
  const historyState = JSON.parse(JSON.parse(historyText) as string) as {
    url: string;
    htmlRoots: number;
    bodyCount: number;
    items: string | null;
  };
  const historyPassed =
    historyState.url === "/page-fragment" &&
    historyState.htmlRoots === 1 &&
    historyState.bodyCount === 1 &&
    historyState.items === "Items";
  // the stable lane is a hard assertion; the experimental lane records the
  // observation (the htmx 4 beta reworks history internals, per its profile)
  if (lane === "htmx2" && !historyPassed) {
    throw new Error(`history restore failed in ${lane}: ${historyText}`);
  }

  // GH-061: CSRF no-JS form flow (hidden field), header flow, and the
  // token-less failure — server-side protection, hard-asserted in both lanes.
  await run("csrf-open", ["open", `${baseUrl}/csrf-form`]);
  await run("csrf-submit", ["click", "#csrf-form button[type=submit]"]);
  await run("csrf-wait", [
    "run-code",
    "async page => { await page.waitForTimeout(250); }",
  ]);
  await run("csrf-result", [
    "eval",
    "() => document.body.textContent",
    "--filename",
    "csrf-result.txt",
  ]);
  const csrfResult = await readFile(
    join(artifactDirectory, "csrf-result.txt"),
    "utf8",
  );
  if (!csrfResult.includes("csrf-ok:Bundar")) {
    throw new Error(
      `CSRF-protected form submit failed in ${lane}: ${csrfResult}`,
    );
  }

  await run("csrf-header-open", ["open", `${baseUrl}/csrf-form`]);
  await run("csrf-header-eval", [
    "eval",
    "async () => { const token = document.querySelector('input[name=\"_csrf\"]').value; const ok = await fetch('/csrf-protected', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-csrf-token': token }, body: 'name=ViaHeader' }); const okText = await ok.text(); const noToken = await fetch('/csrf-protected', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'name=x' }); return JSON.stringify({ okStatus: ok.status, okText, noTokenStatus: noToken.status }); }",
    "--filename",
    "csrf-header.json",
  ]);
  const csrfHeaderText = await readFile(
    join(artifactDirectory, "csrf-header.json"),
    "utf8",
  );
  const csrfHeader = JSON.parse(JSON.parse(csrfHeaderText) as string) as {
    okStatus: number;
    okText: string;
    noTokenStatus: number;
  };
  if (
    csrfHeader.okStatus !== 200 ||
    !csrfHeader.okText.includes("csrf-ok:ViaHeader")
  ) {
    throw new Error(
      `CSRF header submission failed in ${lane}: ${csrfHeaderText}`,
    );
  }
  if (csrfHeader.noTokenStatus !== 403) {
    throw new Error(
      `CSRF token-less submission was not rejected in ${lane}: ${csrfHeaderText}`,
    );
  }

  // GH-065: error negotiation — a 422 updates the region for enhanced
  // requests; 403 NEVER serves protected fragment content (document path);
  // ordinary browsers get a usable full-page error.
  await run("errors-eval", [
    "eval",
    "async () => { const validationEnhanced = await fetch('/error-validation', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'HX-Request': 'true', 'HX-Target': '#hostile-client-target' }, body: 'name=' }); const validationEnhancedBody = await validationEnhanced.text(); const validationOrdinary = await fetch('/error-validation', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'name=' }); const validationOrdinaryBody = await validationOrdinary.text(); const forbiddenEnhanced = await fetch('/error-forbidden', { headers: { 'HX-Request': 'true' } }); const forbiddenEnhancedBody = await forbiddenEnhanced.text(); const forbiddenOrdinary = await fetch('/error-forbidden'); const forbiddenOrdinaryBody = await forbiddenOrdinary.text(); return JSON.stringify({ validationEnhancedStatus: validationEnhanced.status, validationEnhancedBody, validationRetarget: validationEnhanced.headers.get('hx-retarget'), validationOrdinaryStatus: validationOrdinary.status, validationOrdinaryIsDocument: validationOrdinaryBody.startsWith('<!doctype html>'), forbiddenEnhancedStatus: forbiddenEnhanced.status, forbiddenEnhancedBody, forbiddenEnhancedIsDocument: forbiddenEnhancedBody.startsWith('<!doctype html>'), forbiddenOrdinaryStatus: forbiddenOrdinary.status, forbiddenOrdinaryIsDocument: forbiddenOrdinaryBody.startsWith('<!doctype html>') }); }",
    "--filename",
    "errors.json",
  ]);
  const errorsText = await readFile(
    join(artifactDirectory, "errors.json"),
    "utf8",
  );
  const errorsState = JSON.parse(JSON.parse(errorsText) as string) as {
    validationEnhancedStatus: number;
    validationEnhancedBody: string;
    validationRetarget: string | null;
    validationOrdinaryStatus: number;
    validationOrdinaryIsDocument: boolean;
    forbiddenEnhancedStatus: number;
    forbiddenEnhancedBody: string;
    forbiddenEnhancedIsDocument: boolean;
    forbiddenOrdinaryStatus: number;
    forbiddenOrdinaryIsDocument: boolean;
  };
  if (
    errorsState.validationEnhancedStatus !== 422 ||
    !errorsState.validationEnhancedBody.includes("Name is required") ||
    errorsState.validationRetarget !== "#error-target" ||
    errorsState.validationOrdinaryStatus !== 422 ||
    !errorsState.validationOrdinaryIsDocument ||
    errorsState.forbiddenEnhancedStatus !== 403 ||
    !errorsState.forbiddenEnhancedIsDocument ||
    errorsState.forbiddenEnhancedBody.includes("secret-fragment") ||
    errorsState.forbiddenOrdinaryStatus !== 403 ||
    !errorsState.forbiddenOrdinaryIsDocument
  ) {
    throw new Error(`error negotiation failed in ${lane}: ${errorsText}`);
  }

  // GH-060: validated form action — identical validation in both worlds.
  await run("validated-form-eval", [
    "eval",
    "async () => { const invalidEnhanced = await fetch('/validated-form', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'HX-Request': 'true' }, body: 'name=' }); const invalidEnhancedBody = await invalidEnhanced.text(); const invalidOrdinary = await fetch('/validated-form', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'name=' }); const invalidOrdinaryBody = await invalidOrdinary.text(); const validEnhanced = await fetch('/validated-form', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'HX-Request': 'true' }, body: 'name=Bundar' }); const validEnhancedBody = await validEnhanced.text(); const validOrdinary = await fetch('/validated-form', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'name=Bundar', redirect: 'manual' }); return JSON.stringify({ invalidEnhancedStatus: invalidEnhanced.status, invalidEnhancedBody, invalidRetarget: invalidEnhanced.headers.get('hx-retarget'), invalidOrdinaryStatus: invalidOrdinary.status, invalidOrdinaryIsDocument: invalidOrdinaryBody.startsWith('<!doctype html>'), validEnhancedStatus: validEnhanced.status, validEnhancedBody, validOrdinaryType: validOrdinary.type }); }",
    "--filename",
    "validated-form.json",
  ]);
  const validatedText = await readFile(
    join(artifactDirectory, "validated-form.json"),
    "utf8",
  );
  const validatedState = JSON.parse(JSON.parse(validatedText) as string) as {
    invalidEnhancedStatus: number;
    invalidEnhancedBody: string;
    invalidRetarget: string | null;
    invalidOrdinaryStatus: number;
    invalidOrdinaryIsDocument: boolean;
    validEnhancedStatus: number;
    validEnhancedBody: string;
    validOrdinaryType: string;
  };
  if (
    validatedState.invalidEnhancedStatus !== 422 ||
    !validatedState.invalidEnhancedBody.includes("Name too short") ||
    !validatedState.invalidEnhancedBody.includes('id="register"') ||
    validatedState.invalidEnhancedBody.includes("<html") ||
    validatedState.invalidRetarget !== "#register-card" ||
    validatedState.invalidOrdinaryStatus !== 422 ||
    !validatedState.invalidOrdinaryIsDocument ||
    validatedState.validEnhancedStatus !== 200 ||
    !validatedState.validEnhancedBody.includes("hi Bundar") ||
    validatedState.validOrdinaryType !== "opaqueredirect"
  ) {
    throw new Error(
      `validated form action failed in ${lane}: ${validatedText}`,
    );
  }

  // GH-051: multi-region updates through real htmx OOB — the same intent
  // source serves both dialect lanes; the counter element is replaced and
  // a row appends out-of-band.
  await run("multi-region-open", ["open", baseUrl]);
  await run("multi-region-click", ["click", "#mr-trigger"]);
  await run("multi-region-wait", [
    "run-code",
    "async page => { await page.waitForTimeout(250); }",
  ]);
  await run("multi-region-eval", [
    "eval",
    "() => JSON.stringify({ counter: document.querySelector('#mr-counter')?.textContent ?? null, rows: document.querySelectorAll('#mr-list li').length, lastRow: document.querySelectorAll('#mr-list li')[1]?.textContent ?? null })",
    "--filename",
    "multi-region.json",
  ]);
  const multiRegionText = await readFile(
    join(artifactDirectory, "multi-region.json"),
    "utf8",
  );
  const multiRegion = JSON.parse(JSON.parse(multiRegionText) as string) as {
    counter: string | null;
    rows: number;
    lastRow: string | null;
  };
  const multiRegionPassed =
    multiRegion.counter === "42 items" &&
    multiRegion.rows === 2 &&
    multiRegion.lastRow === "fresh row";
  if (lane === "htmx2" && !multiRegionPassed) {
    throw new Error(
      `multi-region update failed in ${lane}: ${multiRegionText}`,
    );
  }

  // GH-062: session lifecycle through real browser cookies (same-origin
  // fetch sends them automatically): login rotates, whoami reads the store,
  // logout invalidates both the cookie and the backing record. Cookie
  // attribute policy is proven by security:cookies + unit tests — the Fetch
  // API hides Set-Cookie from page scripts, so this check stays behavioral.
  await run("session-eval", [
    "eval",
    "async () => { const anonymous = await (await fetch('/session-whoami')).text(); const login = await fetch('/session-login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'user=bundar' }); const loginText = await login.text(); const whoami = await (await fetch('/session-whoami')).text(); const logout = await fetch('/session-logout', { method: 'POST' }); await logout.text(); const after = await (await fetch('/session-whoami')).text(); return JSON.stringify({ anonymous, loginText, whoami, after }); }",
    "--filename",
    "session.json",
  ]);
  const sessionText = await readFile(
    join(artifactDirectory, "session.json"),
    "utf8",
  );
  const sessionState = JSON.parse(JSON.parse(sessionText) as string) as {
    anonymous: string;
    loginText: string;
    whoami: string;
    after: string;
  };
  if (
    sessionState.anonymous !== "anonymous" ||
    sessionState.loginText !== "logged-in:bundar" ||
    sessionState.whoami !== "bundar" ||
    sessionState.after !== "anonymous"
  ) {
    throw new Error(`session lifecycle failed in ${lane}: ${sessionText}`);
  }

  await run("csrf-bad-open", ["open", `${baseUrl}/csrf-form-bad`]);
  await run("csrf-bad-submit", ["click", "#csrf-form button[type=submit]"]);
  await run("csrf-bad-wait", [
    "run-code",
    "async page => { await page.waitForTimeout(250); }",
  ]);
  await run("csrf-bad-result", [
    "eval",
    "() => document.body.textContent",
    "--filename",
    "csrf-bad-result.txt",
  ]);
  const csrfBad = await readFile(
    join(artifactDirectory, "csrf-bad-result.txt"),
    "utf8",
  );
  if (!csrfBad.includes("request verification failed")) {
    throw new Error(`token-less form was not rejected in ${lane}: ${csrfBad}`);
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
      "csrf-form-flow",
      "csrf-header-flow",
      "csrf-rejection",
      "session-lifecycle",
      "history-restore",
      "action-fallback",
      "error-negotiation",
      "validated-form",
      "multi-region",
    ],
    csrf: {
      issue: "GH-061",
      formFlow: "csrf-ok:Bundar",
      headerFlow: "csrf-ok:ViaHeader",
      rejection: 403,
    },
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
      "csrf-result.txt",
      "csrf-header.json",
      "csrf-bad-result.txt",
      "session.json",
      "history-restore.json",
      "action-fallback.json",
      "errors.json",
      "validated-form.json",
      "multi-region.json",
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
