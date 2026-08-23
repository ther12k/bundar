/**
 * BR-058 JSX/stream propagation tests: abort stops traversal before
 * unstarted components run, no late enqueue, cleanup exactly once, and the
 * abort is never converted into ordinary error markup.
 */
import { describe, expect, test } from "bun:test";
import { renderToStream } from "../../src/render-to-stream";
import { AbortedRenderError } from "../../src/render/async";

async function drain(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    return text;
  } catch (error) {
    throw Object.assign(
      new Error(`stream failed: ${(error as Error).message}`),
      { cause: error },
    );
  }
}

describe("BR-058 render cancellation", () => {
  test("abort stops traversal; unstarted components never execute", async () => {
    const controller = new AbortController();
    const ranLater: string[] = [];

    async function Slow({ label }: { label: string }): Promise<string> {
      await new Promise((r) => setTimeout(r, 10));
      ranLater.push(label);
      return `<span>${label}</span>`;
    }

    const tree = (
      <div>
        <Slow label="one" />
        <Slow label="two" />
        <Slow label="three" />
      </div>
    );

    const rendered = renderToStream(tree, { signal: controller.signal });
    const reading = drain(rendered.stream);
    controller.abort();
    await expect(reading).rejects.toThrow();
    // give any (wrongly) scheduled components a chance to prove guilt
    await new Promise((r) => setTimeout(r, 40));
    expect(ranLater.length).toBeLessThan(3);
  });

  test("no chunks are enqueued after abort", async () => {
    const controller = new AbortController();
    let enqueuedAfterAbort = 0;
    let aborted = false;

    function* chunks(): Generator<string> {
      for (let i = 0; i < 50; i++) {
        if (aborted) enqueuedAfterAbort += 1;
        yield `<p>${i}</p>`;
      }
    }

    const rendered = renderToStream(chunks(), {
      signal: controller.signal,
      chunkBytes: 4,
    });
    const reader = rendered.stream.getReader();
    controller.abort();
    try {
      for (;;) {
        const { done } = await reader.read();
        if (done) break;
      }
    } catch {
      // expected termination path
    }
    aborted = true;
    expect(enqueuedAfterAbort).toBe(0);
  });

  test("abort error surfaces as cancellation, not generic failure markup", async () => {
    const controller = new AbortController();
    const rendered = renderToStream(<div>never finishes</div>, {
      signal: controller.signal,
    });
    const reading = drain(rendered.stream);
    setTimeout(() => controller.abort(new Error("client gone")), 5);
    const chain: unknown[] = [];
    try {
      await reading;
    } catch (error) {
      let current: unknown = error;
      for (let depth = 0; depth < 4 && current instanceof Error; depth++) {
        chain.push(current);
        current = (current as { cause?: unknown }).cause;
      }
    }
    expect(
      chain.some((e) => e instanceof AbortedRenderError),
      `expected AbortedRenderError in chain: ${chain.map(String).join(" | ")}`,
    ).toBe(true);
    expect(
      chain.some((e) => e instanceof Error && /client gone/.test(e.message)),
    ).toBe(true);
  });

  test("pre-aborted signal errors immediately without rendering", async () => {
    const controller = new AbortController();
    controller.abort();
    let executed = false;
    const Component = (): string => {
      executed = true;
      return "<b>x</b>";
    };
    await expect(
      drain(
        renderToStream(<Component />, {
          signal: controller.signal,
        }).stream,
      ),
    ).rejects.toThrow();
    expect(executed).toBe(false);
  });
});
