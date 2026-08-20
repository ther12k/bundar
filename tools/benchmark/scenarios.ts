import type { BenchmarkScenario } from "./types";

const requests = {
  get: (path: string, init?: RequestInit) =>
    new Request(`http://benchmark.invalid${path}`, { method: "GET", ...init }),
  post: (path: string, body: string) =>
    new Request(`http://benchmark.invalid${path}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    }),
};

export const scenarios: readonly BenchmarkScenario[] = [
  {
    id: "static-response",
    category: "micro",
    description: "Return a static HTML Response.",
    request: () => requests.get("/static"),
  },
  {
    id: "dynamic-text",
    category: "micro",
    description: "Return a dynamic text response from the request URL.",
    request: () => requests.get("/dynamic?value=benchmark"),
  },
  {
    id: "parameterized-route",
    category: "micro",
    description: "Read one path parameter and render it.",
    request: () => requests.get("/users/42"),
  },
  {
    id: "sync-middleware",
    category: "micro",
    description: "Run one synchronous middleware before the response.",
    request: () => requests.get("/middleware/sync"),
  },
  {
    id: "async-middleware",
    category: "micro",
    description: "Run one asynchronous middleware before the response.",
    request: () => requests.get("/middleware/async"),
  },
  {
    id: "escaped-jsx-fragment",
    category: "micro",
    description: "Render an escaped HTML fragment.",
    request: () => requests.get("/fragment"),
  },
  {
    id: "async-jsx-component",
    category: "micro",
    description: "Resolve one asynchronous component and render HTML.",
    request: () => requests.get("/async-component"),
  },
  {
    id: "page-fragment-negotiation",
    category: "representative",
    description:
      "Select a full-page or fragment representation from a request header.",
    request: () =>
      requests.get("/negotiated", {
        headers: { "HX-Request": "true" },
      }),
  },
  {
    id: "validated-form",
    category: "representative",
    description: "Parse and validate a URL-encoded form submission.",
    request: () =>
      requests.post("/form", "name=Bundar&email=team%40bundar.invalid"),
  },
];
