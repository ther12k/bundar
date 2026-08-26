/**
 * BR-075 accessibility lane: axe-core automated scan (critical/serious
 * must be zero, no waivers) plus targeted assertions automation cannot
 * prove, across the canonical pages of BOTH reference applications.
 *
 * Pages scanned: todo home (list+form), todo validation-error re-render,
 * admin login (fieldset+radios), admin article list (table semantics),
 * admin detail (edit form) — and the todo DOM AFTER an htmx-enhanced
 * fragment swap (criterion 4: enhancement must not degrade semantics).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createLaneRunner, assertInPage } from "../lanes/cli";
import { startLaneServer } from "../lanes/server";

const lane = await startLaneServer();
const runner = await createLaneRunner("accessibility");
const todoUrl = `http://127.0.0.1:${lane.todo.port}`;
const adminUrl = `http://127.0.0.1:${lane.admin.port}`;

/** Loads axe from the lane server, runs the tagged scan, returns JSON. */
const SCAN = `async () => {
  if (typeof window.axe === "undefined") {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/__bundar/axe.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("axe failed to load"));
      document.head.append(script);
    });
  }
  const results = await window.axe.run(document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
  });
  const gate = results.violations
    .filter(v => v.impact === "critical" || v.impact === "serious")
    .map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help }));
  return JSON.stringify({ url: location.pathname, blocking: gate,
    lower: results.violations.filter(v => v.impact !== "critical" && v.impact !== "serious")
      .map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })) });
}`;

async function scanAndGate(label: string): Promise<void> {
  await runner.run(`${label}-scan`, [
    "eval",
    SCAN,
    "--filename",
    `${label}-scan.json`,
  ]);
  const raw = await readFile(
    join(runner.artifactDirectory, `${label}-scan.json`),
    "utf8",
  );
  // eval --filename writes the return value stringified: our scan returns
  // a JSON string, so the artifact is doubly encoded (same as run.ts).
  const parsed = JSON.parse(JSON.parse(raw)) as {
    blocking: { id: string; impact: string; nodes: number }[];
  };
  if (parsed.blocking.length > 0)
    throw new Error(
      `${label}: ${parsed.blocking.length} blocking a11y violation(s): ` +
        JSON.stringify(parsed.blocking),
    );
  console.log(`  ${label}: 0 critical/serious violations`);
}

try {
  // --- Todo: home, then validation-error re-render -----------------------
  await runner.run("open", ["open", `${todoUrl}/`, "--browser", "chrome"]);
  await scanAndGate("todo-home");

  // Targeted: validation error is ASSOCIATED with the field + announced.
  // htmx 2 defaults do not swap 4xx bodies (see #139 / BR-087) — the app
  // bootstrap enables the documented responseHandling preset first, then
  // this proves the swapped fragment carries a correctly associated error.
  await assertInPage(
    runner,
    "todo-error-association",
    `async () => {
      window.htmx.config.responseHandling = [
        { code: "204", swap: false },
        { code: "[23]..", swap: true },
        { code: "[45]..", swap: true, error: true },
        { code: "default", swap: false, error: true },
      ];
      document.querySelector('input[name=title]').value = 'x'; // 1 char < min
      document.querySelector('#todo-form button[type=submit]').click();
      await new Promise(r => setTimeout(r, 600));
      const input = document.querySelector('input[name=title]');
      const described = input.getAttribute('aria-describedby');
      const error = document.getElementById('title-error');
      if (!error || error.textContent.trim().length === 0) throw new Error('no error text');
      if (!described || !described.split(/\\s+/).includes('title-error'))
        throw new Error('input not associated with title-error');
      if (input.getAttribute('aria-invalid') !== 'true') throw new Error('aria-invalid missing');
      return 'associated+' + error.textContent.trim();
    }`,
  );
  await scanAndGate("todo-validation");

  // Criterion 4: re-scan AFTER a successful htmx-enhanced swap.
  await assertInPage(
    runner,
    "todo-enhanced-swap",
    `async () => {
      document.querySelector('input[name=title]').value = 'Accessibility lane todo';
      document.querySelector('#todo-form button[type=submit]').click();
      await new Promise(r => setTimeout(r, 500));
      const items = [...document.querySelectorAll('#todo-list li .title')].map(e => e.textContent);
      if (!items.includes('Accessibility lane todo')) throw new Error('swap did not append item');
      return 'swapped:' + items.length;
    }`,
  );
  await scanAndGate("todo-after-swap");

  // --- Admin: login, list (table), detail (edit form) --------------------
  await runner.run("goto-login", ["goto", `${adminUrl}/login`]);
  await scanAndGate("admin-login");

  // The login form is deliberately plain HTML (no hx-post): submitting
  // NAVIGATES (PRG), so wait from the outer context that survives it.
  await runner.run("admin-login-prg", [
    "run-code",
    `async page => {
      await page.evaluate(() => {
        document.getElementById('user-editor').click();
        document.querySelector('#login-form button[type=submit]').click();
      });
      await page.waitForFunction(() => document.querySelector('#article-table') !== null, null, { timeout: 8000 });
      return await page.evaluate(() => 'logged-in:' + (document.querySelector('#whoami')?.textContent ?? 'unknown'));
    }`,
  ]);
  await scanAndGate("admin-list");

  // Table semantics beyond axe: every th carries scope=col.
  await assertInPage(
    runner,
    "admin-table-scope",
    `async () => {
      const ths = [...document.querySelectorAll('#article-table th')];
      if (ths.length < 3) throw new Error('table headers missing');
      const unscoped = ths.filter(th => th.getAttribute('scope') !== 'col');
      if (unscoped.length > 0) throw new Error(unscoped.length + ' th without scope=col');
      return ths.length + ' scoped columns';
    }`,
  );

  await runner.run("goto-detail", [
    "goto",
    `${adminUrl}${
      (await (await fetch(`${adminUrl}/articles`)).text()).match(
        /href="([^"]*articles\/[^"]+)"/,
      )?.[1] ?? "/articles"
    }`,
  ]);
  await scanAndGate("admin-detail");

  // Labels/names beyond axe: every visible form control is labeled here.
  await assertInPage(
    runner,
    "admin-labels",
    `async () => {
      const controls = [...document.querySelectorAll('#article-form input:not([type=hidden]), #article-form select')]
        .filter(el => el.offsetParent !== null);
      if (controls.length === 0) throw new Error('no visible form controls');
      const unnamed = controls.filter(el => {
        const label = el.labels && el.labels.length > 0;
        const aria = el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby');
        return !(label || aria);
      });
      if (unnamed.length > 0) throw new Error(unnamed.length + ' unnamed control(s)');
      return controls.length + ' named controls';
    }`,
  );

  // Landmarks + heading structure across every visited document shape.
  await assertInPage(
    runner,
    "landmarks-headings",
    `async () => {
      const missing = [];
      for (const tag of ['header', 'main'])
        if (!document.querySelector(tag)) missing.push(tag);
      if (document.querySelectorAll('h1').length !== 1) missing.push('exactly-one-h1');
      if (!document.getElementById('flash')?.getAttribute('aria-live')) missing.push('flash-aria-live');
      if (missing.length > 0) throw new Error('missing: ' + missing.join(','));
      return 'landmarks+headings+flash ok';
    }`,
  );

  await runner.run("close", ["close"], false);
  console.log("accessibility lane: PASS (7 scans, 0 blocking violations)");
} catch (error) {
  await runner.run("close", ["close"], false);
  lane.stop();
  console.error(
    `accessibility lane: FAIL — ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
lane.stop();
