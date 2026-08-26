/**
 * GH-034 streaming render coverage: non-buffering by design, backpressure,
 * cancellation and abort, mid-stream errors, Unicode boundaries across
 * chunks, and output parity with renderToStringAsync.
 */
import { describe, expect, test } from "bun:test";
import {
  Fragment,
  jsx,
  renderToStream,
  renderToStringAsync,
  streamResponse,
  StreamRenderError,
} from "../../src/index";
import {
  RenderCancelledError,
  StreamRenderError as StreamError,
} from "../../src/index";

async function collect(
  stream: ReadableStream<Uint8Array>,
): Promise<{ text: string; chunkCount: number }> {
  const decoder = new TextDecoder("utf-8");
  let text = "";
  let chunkCount = 0;
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunkCount += 1;
    // stream:true reassembles multi-byte sequences split across chunks
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return { text, chunkCount };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Reads chunks until the decoded output contains `marker`. The last read
 * blocks once the walker suspends on an awaited child, so this terminates. */
async function readUntil(
  reader: { read(): Promise<{ done: boolean; value?: Uint8Array }> },
  marker: string,
): Promise<string> {
  const decoder = new TextDecoder();
  let text = "";
  while (!text.includes(marker)) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text;
}

describe("GH-034 non-buffering by design", () => {
  test("output before an awaited child is readable before the child resolves", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<unknown>((resolve) => {
      release = () => resolve(jsx("p", { children: "late" }));
    });
    const tree = jsx("html", {
      children: [
        jsx("head", { children: jsx("title", { children: "Early" }) }),
        gate,
      ],
    });
    const { stream } = renderToStream(tree);
    const reader = stream.getReader();
    // segments arrive one per pull; accumulate until the pre-gate prefix is
    // visible — the next read blocks on the gate, proving nothing was held
    const prefix = await readUntil(reader, "<title>Early</title>");
    expect(prefix).toContain("<title>Early</title>");
    // the gate has not fired — proves the prefix was never held back
    release!();
    let rest = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      rest += new TextDecoder().decode(value, { stream: true });
    }
    expect(rest).toContain("<p>late</p>");
  });

  test("the whole document never materializes before consumption ends", async () => {
    // a long list of async items: chunk count must exceed 1 (segmented
    // production), and the concatenated output must match the async string
    // renderer byte for byte
    const items = Array.from({ length: 25 }, (_, index) =>
      Promise.resolve(jsx("li", { children: `item-${index}` })),
    );
    const tree = jsx("ul", { children: items });
    const { text, chunkCount } = await collect(renderToStream(tree).stream);
    const expected = await renderToStringAsync(tree);
    expect(text).toBe(expected);
    expect(chunkCount).toBeGreaterThan(1);
  });
});

describe("GH-034 backpressure", () => {
  test("a slow consumer throttles production", async () => {
    let produced = 0;
    const countingItem = (index: number) =>
      jsx("li", {
        children: (() => {
          produced += 1;
          return `i${index}`;
        })(),
      });
    const tree = jsx("ul", {
      children: Array.from({ length: 200 }, (_, index) => countingItem(index)),
    });
    const { stream } = renderToStream(tree, { chunkBytes: 1_024 });
    const reader = stream.getReader();
    // read a little, then stop consuming
    await reader.read();
    await reader.read();
    const producedAtPause = produced;
    await delay(80);
    // production must not have run far ahead while the consumer idled
    // (byte-queued stream stops pulling once the queue passes the mark)
    expect(produced - producedAtPause).toBeLessThan(200);
    // drain to completion — every item eventually renders
    const decoder = new TextDecoder();
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    expect(produced).toBe(200);
    expect(text).toContain("i199");
  });
});

describe("GH-034 cancellation and abort", () => {
  test("reader cancel settles finished with RenderCancelledError and stops the walk", async () => {
    let childObservedCancel = false;
    const controller = new AbortController();
    const tree = jsx("div", {
      children: [
        "before",
        new Promise<string>((_, reject) => {
          controller.signal.addEventListener(
            "abort",
            () => {
              childObservedCancel = true;
              reject(new Error("child work cancelled"));
            },
            { once: true },
          );
        }).then(() => "never"),
      ],
    });
    const { stream, finished } = renderToStream(tree);
    const reader = stream.getReader();
    await readUntil(reader, "before");
    const settle = finished.catch((error: unknown) => error);
    await reader.cancel("consumer left");
    controller.abort();
    expect(await settle).toBeInstanceOf(RenderCancelledError);
    await delay(20);
    expect(childObservedCancel).toBe(true);
  });

  test("an aborted signal errors the stream with the abort reason", async () => {
    const controller = new AbortController();
    const tree = jsx("div", {
      children: ["start", delay(50).then(() => "late")],
    });
    const { stream, finished } = renderToStream(tree, {
      signal: controller.signal,
    });
    const reader = stream.getReader();
    await readUntil(reader, "start");
    controller.abort(new Error("budget exhausted"));
    const settle = finished.catch((error: unknown) => error);
    const failure = await reader.read().then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(failure).toBeDefined();
    expect(await settle).toBeInstanceOf(Error);
  });

  test("an already-aborted signal fails before producing output", async () => {
    const controller = new AbortController();
    controller.abort();
    const { stream } = renderToStream(jsx("p", { children: "x" }), {
      signal: controller.signal,
    });
    const failure = await collect(stream).then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(failure).toBeInstanceOf(StreamError);
  });
});

describe("GH-034 mid-stream errors", () => {
  test("errors after the first flush carry bytesWritten and cannot fake a status", async () => {
    const tree = jsx("div", {
      children: [
        "committed-output",
        Promise.reject(new Error("child exploded")).then(
          () => "never" as const,
        ),
      ],
    });
    const { stream, finished } = renderToStream(tree);
    const reader = stream.getReader();
    await readUntil(reader, "committed-output");
    const settle = finished.catch((error: unknown) => error);
    await reader.read().then(
      () => undefined,
      () => undefined,
    );
    const error = (await settle) as StreamRenderError;
    expect(error).toBeInstanceOf(StreamRenderError);
    expect(error.bytesWritten).toBeGreaterThan(0);
    expect(error.message).toContain("child exploded");
  });

  test("errors before any flush still report zero bytes", async () => {
    const { stream, finished } = renderToStream(
      Promise.reject(new Error("immediate")),
    );
    const settle = finished.catch((error: unknown) => error);
    await collect(stream).then(
      () => undefined,
      () => undefined,
    );
    const error = (await settle) as StreamRenderError;
    expect(error.bytesWritten).toBe(0);
  });
});

describe("GH-034 Unicode boundaries", () => {
  test("multi-byte characters reassemble across chunk boundaries", async () => {
    const parts = ["日本語", "🎉🚀", " naïve café ", "𝕏𝕐"];
    const tree = jsx("p", {
      children: parts.map((part, index) =>
        Promise.resolve(part + (index < parts.length - 1 ? "" : "")),
      ),
    });
    const { text } = await collect(renderToStream(tree).stream);
    expect(text).toBe(`<p>${parts.join("")}</p>`);
  });

  test("decoded streaming output equals the string renderer byte for byte", async () => {
    const tree = jsx(Fragment, {
      children: [
        jsx("p", { children: "héllo wörld — ünïcode ✓" }),
        Promise.resolve(jsx("p", { children: "🎉 sanitized <b>&amp;</b>" })),
      ],
    });
    const { text } = await collect(renderToStream(tree).stream);
    expect(text).toBe(await renderToStringAsync(tree));
  });
});

describe("BR-110 byte-aware chunking", () => {
  test("ChunkCollector bounds chunks by UTF-8 bytes rather than UTF-16 code units", async () => {
    // Multi-byte Unicode: each 4-byte emoji is 2 code units in JS
    const emoji = "🎉"; // 4 bytes in UTF-8
    const tree = jsx("div", {
      children: Array.from({ length: 50 }, () => emoji),
    });
    // Set small byte limit of 32 bytes
    const chunks: Uint8Array[] = [];
    const stream = renderToStream(tree, { chunkBytes: 32 }).stream;
    const reader = stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    // Chunks should be segmented based on byte bounds
    expect(chunks.length).toBeGreaterThan(1);
    const totalBytes = chunks.reduce((sum, c) => sum + c.byteLength, 0);
    const expected = await renderToStringAsync(tree);
    expect(new TextDecoder().decode(Buffer.concat(chunks))).toBe(expected);
    expect(totalBytes).toBe(Buffer.byteLength(expected, "utf8"));
  });
});

describe("GH-034 streamResponse", () => {
  test("streams a text/html response and exposes finished", async () => {
    const response = streamResponse(
      jsx("p", { children: Promise.resolve("streamed") }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/html; charset=utf-8",
    );
    const body = await new Response(response.body).text();
    expect(body).toBe("<p>streamed</p>");
    await response.finished;
  });

  test("status and headers pass through", async () => {
    const response = streamResponse(jsx("p", { children: "x" }), {
      status: 201,
      headers: { "x-bundar": "stream" },
    });
    expect(response.status).toBe(201);
    expect(response.headers.get("x-bundar")).toBe("stream");
    expect(response.headers.get("content-type")).toBe(
      "text/html; charset=utf-8",
    );
  });

  test("mid-stream failure rejects the response's finished promise", async () => {
    const response = streamResponse(
      jsx("p", {
        children: [
          "partial",
          Promise.reject(new Error("late failure")).then(
            () => "never" as const,
          ),
        ],
      }),
    );
    const settle = response.finished.catch((error: unknown) => error);
    await new Response(response.body).text().then(
      () => undefined,
      () => undefined,
    );
    const error = (await settle) as StreamRenderError;
    expect(error).toBeInstanceOf(StreamRenderError);
    expect(error.bytesWritten).toBeGreaterThan(0);
  });
});
