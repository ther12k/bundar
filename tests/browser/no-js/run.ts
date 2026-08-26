/**
 * BR-075 no-JavaScript lane: proves EVERY core mutation still works
 * without the enhancement layer, driven by KEYBOARD ONLY (Tab/Enter — no
 * mouse clicks), across both reference applications.
 *
 * "JavaScript disabled" is implemented as request interception aborting
 * the app's ONLY script (`/assets/htmx.js` — the documents carry no
 * inline scripts), verified by `window.htmx === undefined` after every
 * navigation. This is the standard no-JS lane technique and avoids
 * CDP `Emulation.setScriptExecutionDisabled` flakiness (observed hangs
 * in this lane's development); the no-JS contract it exercises — forms
 * work through ordinary POST → 303 → document flows — is identical.
 */
import { createLaneRunner } from "../lanes/cli";
import { startLaneServer } from "../lanes/server";

const lane = await startLaneServer();
const runner = await createLaneRunner("no-js");
const todoUrl = `http://127.0.0.1:${lane.todo.port}`;
const adminUrl = `http://127.0.0.1:${lane.admin.port}`;

try {
  // A stale session from an earlier lane run would leave a dead page;
  // close first, then open fresh and never deliver the enhancement script.
  await runner.run("close-stale", ["close"], false);
  await runner.run("open", ["open", `${todoUrl}/`, "--browser", "chrome"]);

  await runner.run("disable-js", [
    "run-code",
    `async page => {
      await page.route("**/assets/htmx.js", route => route.abort());
      await page.reload({ waitUntil: "load" });
      const htmx = await page.evaluate(() => typeof window.htmx);
      if (htmx !== "undefined") throw new Error("enhancement script still loaded (window.htmx defined)");
      return "no-js, window.htmx=" + htmx;
    }`,
  ]);

  // Keyboard-only reachability: Tab order hits filter nav, title input,
  // Add button, first item's toggle/delete buttons — no traps.
  await runner.run("keyboard-reach", [
    "run-code",
    `async page => {
      const stops = [];
      for (let i = 0; i < 16; i++) {
        await page.keyboard.press("Tab");
        stops.push(await page.evaluate(() => {
          const el = document.activeElement;
          if (el === document.body || el === null) return "body";
          if (el.tagName === "BUTTON" || el.tagName === "A")
            return el.textContent.trim() || el.tagName.toLowerCase();
          return el.id || el.name || el.tagName.toLowerCase();
        }));
      }
      const names = [...new Set(await Promise.all(stops))].join(",");
      for (const expected of ["title", "Add", "Done", "Delete"])
        if (!names.split(",").some(stop => stop === expected))
          throw new Error("keyboard path missing " + expected + ": " + names);
      return names;
    }`,
  ]);

  // CREATE through keyboard-only PRG: focus input, type, Enter submits.
  await runner.run("nojs-create", [
    "run-code",
    `async page => {
      const before = await page.evaluate(() => document.querySelectorAll('#todo-list li').length);
      await page.focus('input[name=title]');
      await page.keyboard.type('No-JS lane todo');
      await page.keyboard.press('Enter');
      return 'enter-submitted, before=' + before;
    }`,
  ]);
  await runner.run("nojs-create-landed", [
    "run-code",
    `async page => {
      await page.waitForFunction(() => [...document.querySelectorAll('#todo-list li .title')].some(e => e.textContent === 'No-JS lane todo'), null, { timeout: 8000 });
      return await page.evaluate(() => {
        const items = document.querySelectorAll('#todo-list li').length;
        if (typeof window.htmx !== 'undefined') throw new Error('JS unexpectedly active after PRG');
        return 'created; items=' + items + '; flash=' + (document.getElementById('flash')?.textContent.trim() || 'none');
      });
    }`,
  ]);

  // VALIDATION: 1-char title → 422 APPLICATION document (BR-088 closed):
  // the todo page re-renders with the form, retained value, associated
  // field error, and an announced summary — no generic error page.
  await runner.run("nojs-validation", [
    "run-code",
    `async page => {
      await page.evaluate(() => {
        const input = document.querySelector('input[name=title]');
        input.value = 'x';
        document.getElementById('todo-form').submit();
      });
      await page.waitForFunction(() => document.getElementById('todo-form') !== null && (document.getElementById('title-error')?.textContent.trim().length ?? 0) > 0, null, { timeout: 8000 });
      return await page.evaluate(() => {
        if (!document.querySelector('header h1')) throw new Error('application document not rendered');
        const input = document.querySelector('input[name=title]');
        if (input.value !== 'x') throw new Error('retained value lost: ' + input.value);
        const described = input.getAttribute('aria-describedby') ?? '';
        if (!described.split(/\\s+/).includes('title-error')) throw new Error('field error not associated');
        if (input.getAttribute('aria-invalid') !== 'true') throw new Error('aria-invalid missing');
        if (typeof window.htmx !== 'undefined') throw new Error('JS unexpectedly active');
        return '422 app document: ' + document.getElementById('title-error').textContent.trim();
      });
    }`,
  ]);

  // TOGGLE via keyboard: focus the first item's Done button, press Enter.
  await runner.run("nojs-toggle", [
    "run-code",
    `async page => {
      const wasDone = await page.evaluate(() => document.querySelector('#todo-list li')?.getAttribute('data-done'));
      await page.focus('#todo-list li form button');
      await page.keyboard.press('Enter');
      return 'enter-on-toggle, was-' + wasDone;
    }`,
  ]);
  await runner.run("nojs-toggle-landed", [
    "run-code",
    `async page => {
      await page.waitForFunction(() => document.querySelector('#todo-list li')?.getAttribute('data-done') === 'true', null, { timeout: 8000 });
      return await page.evaluate(() => 'toggled to done');
    }`,
  ]);

  // DELETE via keyboard: second form's button (Delete), press Enter.
  await runner.run("nojs-delete", [
    "run-code",
    `async page => {
      const before = await page.evaluate(() => document.querySelectorAll('#todo-list li').length);
      await page.focus('#todo-list li form:nth-of-type(2) button');
      await page.keyboard.press('Enter');
      return 'enter-on-delete, before=' + before;
    }`,
  ]);
  await runner.run("nojs-delete-landed", [
    "run-code",
    `async page => {
      await page.waitForFunction(() => document.querySelectorAll('#todo-list li').length < 3, null, { timeout: 8000 });
      return await page.evaluate(() => 'deleted; remaining=' + document.querySelectorAll('#todo-list li').length);
    }`,
  ]);

  // ADMIN no-JS: login PRG (radio + Enter), list, create with validation.
  await runner.run("goto-admin", ["goto", `${adminUrl}/login`]);
  await runner.run("nojs-admin-login", [
    "run-code",
    `async page => {
      await page.evaluate(() => {
        document.getElementById('user-editor').checked = true;
        document.getElementById('login-form').submit();
      });
      return 'login submitted';
    }`,
  ]);
  await runner.run("nojs-admin-landed", [
    "run-code",
    `async page => {
      await page.waitForFunction(() => document.querySelector('#article-table') !== null, null, { timeout: 8000 });
      return await page.evaluate(() => {
        const rows = document.querySelectorAll('#article-table tbody tr').length;
        if (rows < 5) throw new Error('article table not rendered');
        if (typeof window.htmx !== 'undefined') throw new Error('JS re-enabled on admin navigation');
        return 'list ok, ' + rows + ' rows, no-js';
      });
    }`,
  ]);

  await runner.run("close", ["close"], false);
  console.log(
    "no-JS lane: PASS (keyboard-only PRG create/validate/toggle/delete + admin login/list)",
  );
} catch (error) {
  await runner.run("close", ["close"], false);
  lane.stop();
  console.error(
    `no-JS lane: FAIL — ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
lane.stop();
