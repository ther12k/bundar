/**
 * GH-036 browser DOM comparison: rendered output is parsed by a real
 * browser (Chrome for Testing via the playwright CLI) and the DOM is
 * asserted against intended structure for selected edge cases. Fails
 * closed on any mismatch.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { startJsxServer } from "./server";

const repositoryRoot = resolve(import.meta.dir, "..", "..", "..");
const artifactDirectory = join(repositoryRoot, "output", "playwright", "jsx");
await mkdir(artifactDirectory, { recursive: true });

const server = await startJsxServer();
const baseUrl = `http://127.0.0.1:${server.port}`;
const session = `bundar-jsx`;
const home = process.env.HOME ?? "/tmp";
const codexHome = process.env.CODEX_HOME ?? join(home, ".codex");
const pwcli = join(
  codexHome,
  "skills",
  "playwright",
  "scripts",
  "playwright_cli.sh",
);

async function run(name: string, args: string[]): Promise<number> {
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
  if (exitCode !== 0) {
    throw new Error(
      `${name} failed with exit ${exitCode}: ${stderr || stdout}`,
    );
  }
  return exitCode;
}

async function evaluate(name: string, code: string): Promise<unknown> {
  await run(name, ["eval", code, "--filename", `${name}.json`]);
  const text = await Bun.file(join(artifactDirectory, `${name}.json`)).text();
  return JSON.parse(JSON.parse(text) as string);
}

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`browser:jsx assertion failed: ${message}`);
}

try {
  await run("open", ["open", baseUrl, "--browser", "chrome"]);

  // void elements: no children, no closing tags in the DOM
  const voids = (await evaluate(
    "void-elements",
    `async () => {
    const response = await fetch('/case/void-elements');
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    const input = doc.querySelector('input[name=q]');
    return JSON.stringify({
      inputChildren: input ? input.childElementCount : -1,
      inputDisabled: input?.disabled ?? false,
      imgPresent: doc.querySelector('img') !== null,
      brPresent: doc.querySelector('br') !== null,
    });
  }`,
  )) as Record<string, unknown>;
  assert(
    voids.inputChildren === 0,
    `void input has children: ${JSON.stringify(voids)}`,
  );
  assert(voids.inputDisabled === true, "boolean attribute did not apply");
  assert(
    voids.imgPresent === true && voids.brPresent === true,
    "void siblings missing",
  );

  // raw-text script: content parses as script text; close-tag neutralized
  const script = (await evaluate(
    "script-raw-text",
    `async () => {
    const response = await fetch('/case/script-raw-text');
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    const probe = doc.querySelector('script#probe');
    return JSON.stringify({
      executed: window.__jsxProbe === undefined,
      text: probe?.textContent ?? '',
      scriptCount: doc.querySelectorAll('script').length,
    });
  }`,
  )) as Record<string, unknown>;
  assert(
    script.scriptCount === 1,
    "neutralized close-tag created a second script",
  );
  assert(String(script.text).includes("(a<b)"), "script text lost content");

  // attribute escaping round-trips through the DOM
  const attribute = (await evaluate(
    "attribute-roundtrip",
    `async () => {
    const response = await fetch('/case/attribute-roundtrip');
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    const link = doc.querySelector('a#link');
    return JSON.stringify({ title: link?.getAttribute('title') ?? null, href: link?.getAttribute('href') ?? null });
  }`,
  )) as Record<string, unknown>;
  assert(
    attribute.title === 'He said "hi" & <left>',
    `title round-trip mismatch: ${JSON.stringify(attribute)}`,
  );

  // RCDATA: textarea content is text, never markup
  const rcdata = (await evaluate(
    "rcdata-title-textarea",
    `async () => {
    const response = await fetch('/case/rcdata-title-textarea');
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    const ta = doc.querySelector('textarea#ta');
    return JSON.stringify({
      boldInside: ta ? ta.querySelector('b') !== null : true,
      text: ta?.value ?? '',
    });
  }`,
  )) as Record<string, unknown>;
  assert(rcdata.boldInside === false, "textarea RCDATA gained a markup child");
  assert(
    String(rcdata.text).includes("<b>not-bold</b>"),
    `textarea value mismatch: ${JSON.stringify(rcdata)}`,
  );

  // unicode survives the browser parse untouched
  const unicode = (await evaluate(
    "unicode-text",
    `async () => {
    const response = await fetch('/case/unicode-text');
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    return JSON.stringify({ text: doc.querySelector('p#uni')?.textContent ?? '' });
  }`,
  )) as Record<string, unknown>;
  assert(
    unicode.text === "日本語 café 🎉 𝕏 ñ",
    `unicode mismatch: ${JSON.stringify(unicode)}`,
  );

  // raw() trust renders exactly one em child
  const rawTrust = (await evaluate(
    "raw-trust",
    `async () => {
    const response = await fetch('/case/raw-trust');
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    const wrap = doc.querySelector('#rawwrap');
    return JSON.stringify({ em: wrap?.querySelector('em[data-raw]') !== null, text: wrap?.textContent ?? '' });
  }`,
  )) as Record<string, unknown>;
  assert(rawTrust.em === true, "raw() trusted markup missing");
  assert(
    rawTrust.text === "trusted",
    `raw text mismatch: ${JSON.stringify(rawTrust)}`,
  );

  await run("close", ["close"]);
  console.log(
    "browser:jsx: DOM interpretation matches intended structure for all edge cases",
  );
} catch (error) {
  await run("close", ["close"]).catch(() => undefined);
  server.stop(true);
  throw error;
} finally {
  server.stop(true);
}
