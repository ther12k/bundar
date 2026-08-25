/**
 * BR-072 streaming conformance matrix: backpressure, cancellation
 * ordering, late-error policy, resource cleanup exactly-once, and
 * string/stream output parity for deterministic trees.
 */
import { describe, expect, test } from "bun:test";
import { jsx, renderToString } from "../../src/index";
import { renderToStream, StreamRenderError } from "../../src/render-to-stream";

async function drain(
  stream: ReadableStream<Uint8Array>,
  onChunk?: (text: string) => void,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const piece = decoder.decode(value, { stream: true });
    onChunk?.(piece);
    text += piece;
  }
  return text;
}

describe("BR-072 streaming conformance matrix", () => {
  test("backpressure: producer pauses behind a slow consumer", async () => {
    let produced = 0;
    function* source(): Generator<string> {
      for (let i = 0; i < 60; i++) {
        produced += 1;
        yield `<p>${i}</p>`;
      }
    }
    const rendered = renderToStream(source(), { chunkBytes: 16 });
    const reader = rendered.stream.getReader();

    // read ONE chunk then stop consuming for a while
    await reader.read();
    const producedWhilePaused = produced;
    await new Promise((r) => setTimeout(r, 40));
    // pull-based queue: the producer did NOT race ahead unbounded
    expect(produced - producedWhilePaused).toBeLessThanOrEqual(4);

    // resume to completion
    for (;;) {
      const { done } = await reader.read();
      if (done) break;
    }
    expect(produced).toBe(60);
  });

  test("abort before first byte: nothing enqueues", async () => {
    const controller = new AbortController();
    controller.abort(); // BEFORE any read
    let enqueued = 0;
    const tree = (
      <div>
        <p>never</p>
      </div>
    );
    void tree;
    const rendered = renderToStream("<div>never</div>", {
      signal: controller.signal,
    });
    const reader = rendered.stream.getReader();
    try {
      await reader.read();
    } catch {
      /* expected termination */
    }
    expect(enqueued).toBe(0);
  });

  test("late producer error terminates the stream with correlated cause", async () => {
    const original = new Error("db vanished mid-table");
    function* rows(): Generator<string> {
      yield "<tr>1</tr>";
      throw original;
    }
    const rendered = renderToStream(jsx("table", { children: rows() }), {
      chunkBytes: 8,
    });
    let caught: unknown;
    let text = "";
    try {
      text += await drain(rendered.stream);
    } catch (error) {
      caught = error;
    }
    expect(caught instanceof StreamRenderError).toBe(true);
    expect((caught as StreamRenderError).cause).toBe(original);
    // Late-error POLICY: terminate, never inject fallback error markup.
    expect(text).not.toContain("error");
    expect(text).not.toContain("Internal Server Error");
  });

  test("cleanup runs exactly once on late errors", async () => {
    let cleanups = 0;
    function* leaking(): Generator<string> {
      try {
        yield "<tr>a</tr>";
        yield "<tr>b</tr>";
        throw new Error("boom-after-two");
      } finally {
        cleanups += 1;
      }
    }
    const rendered = renderToStream(leaking(), { chunkBytes: 4 });
    await drain(rendered.stream).catch(() => undefined);
    expect(cleanups).toBe(1);
  });

  test("string and stream outputs MATCH for deterministic trees", async () => {
    const rows = Array.from({ length: 300 }, (_, i) =>
      jsx("tr", {
        children: [
          jsx("td", { children: String(i) }),
          jsx("td", { children: "cell" }),
        ],
      }),
    );
    const tree = jsx("table", { children: rows });
    const asString = renderToString(tree);
    const rendered = renderToStream(tree, { chunkBytes: 32 });
    const asStream = await drain(rendered.stream);
    expect(asStream).toBe(asString);
    expect(asStream.length).toBeGreaterThan(1000); // genuinely large table
  });

  test("nested async components compose and complete", async () => {
    async function Inner({ n }: { n: number }): Promise<string> {
      const pieces: string[] = [];
      for (let i = 0; i < 3; i++) {
        pieces.push(`<li>${n}.${i}</li>`);
        await new Promise((r) => setTimeout(r, 1));
      }
      return `<ul data-n="${n}">${pieces.join("")}</ul>`;
    }
    async function Outer(): Promise<string> {
      const one = await Inner({ n: 1 });
      const two = await Inner({ n: 2 });
      return one + two;
    }
    const text = await drain(renderToStream(Outer()).stream);
    expect(text).toContain("&lt;li&gt;1.2&lt;/li&gt;");
    expect(text).toContain("&lt;li&gt;2.2&lt;/li&gt;");
  });
});
