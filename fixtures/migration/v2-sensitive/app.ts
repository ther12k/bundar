/**
 * Migration fixture: every v2-sensitive pattern in one file. The audit
 * tool must find each one with the right severity and line evidence.
 */
export function triggerHeader(): Record<string, string> {
  // header rename (blocking): v4 sends the trigger under HX-Source
  return { "HX-Trigger": "save-button" };
}

export function onHistoryRestore(): void {
  document.body.addEventListener("htmx:historyRestore", () => {});
}

export const inheritedForm = `
  <div hx-boost="true">
    <button hx-post="/go" hx-confirm="Sure?">Go</button>
  </div>`;

export function jsonEncoded(): string {
  return '<form hx-post="/api" hx-ext="json-enc"></form>';
}

export function sseStream(): string {
  return '<div hx-ext="sse" sse-connect="/events"></div>';
}

export function errorFragment(): Response {
  // error-swap assumption (review): v2 swaps error bodies; v4 beta does not
  return new Response("<p>failed</p>", {
    status: 422,
    headers: { "content-type": "text/html" },
  });
}

export function pushHistory(): string {
  return '<a hx-get="/page" hx-push-url="true">Page</a>';
}

export const cdnScript =
  '<script src="https://unpkg.com/htmx.org@2.0.10"></script>';

export const localPin = '<script src="/assets/htmx-2.0.10.min.js"></script>';

export function rawEscape(adapter: { id: string }): boolean {
  return adapter.id === "htmx4";
}
