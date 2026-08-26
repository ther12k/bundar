/**
 * GH-024 startup/RSS probe. Runs in a fresh Bun subprocess (spawned by
 * runner.ts) so JIT state cannot leak between samples.
 *
 * - mode "raw": hand-rolled switch handler covering the same scenario
 *   surface with no framework code.
 * - mode "bundar": App registration + compileRoutes + middleware
 *   composition via the shared benchmark app (no hono imports).
 * - mode "carno": @carno.js/core bootstrap (DI container construction +
 *   controller JIT compilation through listen(0)/stop()) via the shared
 *   Carno fixture (no hono or @bundar imports).
 *
 * Bun's performance.now() is milliseconds since process start, so reading
 * it here yields process-boot → app-ready. rssBytes is
 * process.memoryUsage.rss() after the build.
 */
const mode =
  process.argv[2] === "bundar"
    ? "bundar"
    : process.argv[2] === "carno"
      ? "carno"
      : "raw";

export {};

if (mode === "bundar") {
  const { buildBundarApp } = await import("./bundar-app");
  buildBundarApp();
} else if (mode === "carno") {
  const { buildCarnoApp } = await import("./carno-app");
  await buildCarnoApp();
} else {
  const STATIC_HTML = "<p>static</p>";
  const FRAGMENT_HTML = '<p data-kind="fragment">&lt;benchmark&gt;</p>';
  const PAGE_HTML = "<!doctype html><html><body><p>page</p></body></html>";
  const table = (path: string): string => {
    switch (path) {
      case "/static":
        return STATIC_HTML;
      case "/dynamic":
        return "dynamic:";
      case "/users/1":
        return '<p data-user="1">user</p>';
      case "/middleware/sync":
        return "sync-middleware";
      case "/middleware/async":
        return "async-middleware";
      case "/fragment":
        return FRAGMENT_HTML;
      case "/async-component":
        return "<p>async-component</p>";
      case "/negotiated":
        return PAGE_HTML;
      case "/form":
        return '<p data-valid="true">Bundar</p>';
      default:
        return "not-found";
    }
  };
  table("/static");
}

const readyMs = performance.now();
const rssBytes = process.memoryUsage.rss();
console.log(JSON.stringify({ mode, readyMs, rssBytes }));
