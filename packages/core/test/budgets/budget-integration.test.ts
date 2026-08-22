/**
 * GH-067 integration fixtures on a real Bun.serve instance: slowloris
 * dribbled body (408), slow handler (503 at the deadline with the work
 * stopped), client disconnect mid-request (never a 500), and post-failure
 * server health.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  App,
  ErrorBoundary,
  parseForm,
  requestBudget,
  text,
} from "../../src/index";
import { getRequestBudget } from "../../src/budget";

const outcomes: string[] = [];
const boundary = new ErrorBoundary({
  development: false,
  log: (entry) => {
    outcomes.push(`${entry.level}:${entry.message}`);
  },
});

const app = new App();
app.use(
  requestBudget({ requestTimeoutMs: 150, bodyLimits: { timeoutMs: 80 } }),
);

app.post("/form", async (context) => {
  const budget = getRequestBudget(context)!;
  await parseForm(context, budget.bodyLimits);
  return text("accepted");
});

let slowWorkStopped = false;
app.get(
  "/slow-handler",
  (context) =>
    // cooperative slow work: never resolves on its own; stops when the
    // budget signal fires and records that it stopped
    new Promise<Response>((resolve) => {
      const budget = getRequestBudget(context)!;
      budget.signal.addEventListener(
        "abort",
        () => {
          slowWorkStopped = true;
          resolve(text("aborted-work"));
        },
        { once: true },
      );
    }),
);

app.get("/ping", () => text("pong"));

const compiled = app.compile({
  error: (error) => boundary.capture(error),
});
let server: ReturnType<typeof Bun.serve>;
beforeAll(() => {
  server = Bun.serve({ ...compiled, port: 0 });
});
afterAll(() => {
  server.stop(true);
});

const base = () => `http://127.0.0.1:${server.port}`;

describe("GH-067 fixtures on a real server", () => {
  test("slowloris dribble terminates with 408, not a silent partial accept", async () => {
    const received = collectSocket();
    const handler: Bun.SocketHandler = {
      data: (_socket, chunk) => received.push(new TextDecoder().decode(chunk)),
    };
    const conn = await Bun.connect({
      hostname: "127.0.0.1",
      port: server.port!,
      socket: handler,
    });
    conn.write(
      "POST /form HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: 100\r\n\r\nname=Bundar",
    );
    const responseText = await received.finished(3_000);
    conn.end();
    expect(responseText).toContain(" 408 ");
    expect(responseText).toContain("request_timeout");
    expect(responseText).not.toContain("accepted");
  });

  test("slow handler answers 503 at the deadline and the work stops", async () => {
    const startedAt = Date.now();
    const response = await fetch(`${base()}/slow-handler`);
    const elapsed = Date.now() - startedAt;
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("1");
    expect(elapsed).toBeLessThan(2_000);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("service_unavailable");
    expect(slowWorkStopped).toBe(true);
  });

  test("a client disconnect mid-request never surfaces as a 500", async () => {
    const conn = await Bun.connect({
      hostname: "127.0.0.1",
      port: server.port!,
      socket: quietSocket,
    });
    conn.write("GET /slow-handler HTTP/1.1\r\nHost: localhost\r\n\r\n");
    await new Promise((resolve) => setTimeout(resolve, 10));
    conn.end(); // the peer walks away before the deadline
    await new Promise((resolve) => setTimeout(resolve, 250));
    const unexpected = outcomes.filter((entry) =>
      entry.includes("unexpected failure"),
    );
    expect(unexpected).toEqual([]);
  });

  test("the server stays healthy after timeouts and disconnects", async () => {
    const response = await fetch(`${base()}/ping`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("pong");
  });
});

const quietSocket: Bun.SocketHandler = { data: () => {} };

function collectSocket(): {
  push: (chunk: Buffer | string) => void;
  finished: (timeoutMs: number) => Promise<string>;
} {
  const chunks: string[] = [];
  return {
    push: (chunk) => {
      chunks.push(
        typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk),
      );
    },
    finished: (timeoutMs) =>
      new Promise((resolve) => {
        setTimeout(() => resolve(chunks.join("")), timeoutMs);
      }),
  };
}
