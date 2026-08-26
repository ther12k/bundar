/**
 * Shared benchmark payload constants (BR-076). Zero imports so every
 * adapter — raw Bun, Hono, Bundar, Carno — and the startup probes can
 * load them without pulling framework code into another adapter's RSS
 * measurement. Parity checks compare adapters byte-for-byte, so response
 * bodies must never drift between adapter copies.
 */
export const STATIC_HTML = "<p>static</p>";
export const FRAGMENT_HTML = '<p data-kind="fragment">&lt;benchmark&gt;</p>';
export const PAGE_HTML = "<!doctype html><html><body><p>page</p></body></html>";
export const FORM_HTML = '<p data-valid="true">Bundar</p>';
export const INVALID_HTML = '<p data-valid="false">invalid</p>';
export const JSON_PAYLOAD = '{"name":"Bundar","email":"team@bundar.invalid"}';

export function response(
  body: string,
  status = 200,
  headers?: Record<string, string>,
  contentType = "text/html; charset=utf-8",
): Response {
  return new Response(body, {
    status,
    headers: { "content-type": contentType, ...headers },
  });
}

export function textResponse(body: string, status = 200): Response {
  return response(body, status, undefined, "text/plain; charset=utf-8");
}
