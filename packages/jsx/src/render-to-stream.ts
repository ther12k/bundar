/**
 * Streaming JSX rendering (GH-034).
 *
 * Renders a JSX tree to a UTF-8 ReadableStream without buffering the whole
 * document: the depth-first walker yields segments, awaited children are
 * natural flush points (each segment is enqueued on its own pull, so no
 * output is held while a child resolves), and backpressure is real — the
 * byte-queued stream only pulls while the consumer keeps up, throttling
 * production instead of accumulating unbounded chunks. Cancellation (reader
 * cancel or a caller AbortSignal) stops the walk and settles observably.
 * Mid-stream errors carry `bytesWritten`: once bytes have flushed, the
 * status line is committed and no replacement status can be sent — errors
 * are observable, never faked.
 */
import { Fragment } from "./jsx-runtime";
import { renderPrimitive } from "./escape";
import { renderAttributes } from "./render/attributes";
import {
  isRawTextElement,
  isVoidElement,
  serializeRawText,
} from "./render/elements";
import {
  CyclicChildError,
  ComponentRenderError,
  MAX_COMPONENT_DEPTH,
} from "./render/node";
import { AbortedRenderError } from "./render/async";

/** Raised when the render itself fails; `bytesWritten` says if the status
 * line was already committed (no replacement status is possible then). */
export class StreamRenderError extends Error {
  public readonly bytesWritten: number;
  public override readonly cause?: unknown;

  public constructor(cause: unknown, bytesWritten: number) {
    super(
      `stream render failed after ${bytesWritten} byte(s): ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    this.name = "StreamRenderError";
    this.bytesWritten = bytesWritten;
    this.cause = cause;
  }
}

/** Settled on `finished` when the consumer cancelled the stream. */
export class RenderCancelledError extends Error {
  public constructor(reason?: unknown) {
    super(
      `stream render cancelled by the consumer${reason === undefined ? "" : `: ${String(reason)}`}`,
    );
    this.name = "RenderCancelledError";
  }
}

export interface RenderToStreamOptions {
  /** Abort the render: signal-aware work stops, the stream errors. */
  readonly signal?: AbortSignal;
  /**
   * Byte-based high-water mark for the stream queue: while the consumer is
   * behind by more than this, production pauses. Default 8 KiB. Output is
   * never held hostage to this size — every segment is enqueued before the
   * walker suspends on an awaited child.
   */
  readonly chunkBytes?: number;
}

export interface RenderStream {
  /** Encoded UTF-8 chunks; errors mid-stream after the first flush. */
  readonly stream: ReadableStream<Uint8Array>;
  /** Settles when the render completes, fails, aborts, or is cancelled. */
  readonly finished: Promise<void>;
}

export interface StreamResponseOptions extends Omit<
  RenderToStreamOptions,
  "chunkBytes"
> {
  readonly status?: number;
  readonly headers?: Record<string, string>;
}

const DEFAULT_CHUNK_BYTES = 8 * 1_024;
const encoder = new TextEncoder();

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

function isIterable(value: unknown): value is Iterable<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] ===
      "function"
  );
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new AbortedRenderError(signal.reason);
  }
}

/**
 * Depth-first walker mirroring renderNode semantics segment by segment:
 * primitives escape, arrays/iterables iterate once with cycle detection,
 * components invoke (awaiting promised results — the async case streaming
 * exists for), void elements never close, raw-text elements neutralize
 * close-tag sequences. Promised children and iterated promises are awaited
 * in document order.
 */
async function* walk(
  child: unknown,
  depth: number,
  seen: Set<unknown>,
  signal: AbortSignal | undefined,
): AsyncGenerator<string> {
  throwIfAborted(signal);
  if (child === null || child === undefined) return;

  // Promised children anywhere in the tree (top level, direct element
  // children, fragments) are awaited in document order — the flush point
  // streaming exists for.
  if (isPromiseLike(child)) {
    const resolved = await child;
    yield* walk(resolved, depth, seen, signal);
    return;
  }

  const type = typeof child;
  if (
    type === "string" ||
    type === "number" ||
    type === "bigint" ||
    type === "boolean"
  ) {
    yield renderPrimitive(child);
    return;
  }

  if (Array.isArray(child) || isIterable(child)) {
    if (seen.has(child)) throw new CyclicChildError();
    seen.add(child);
    try {
      for (const entry of child) {
        if (isPromiseLike(entry)) {
          const resolved = await entry;
          yield* walk(resolved, depth, seen, signal);
        } else {
          yield* walk(entry, depth, seen, signal);
        }
      }
    } finally {
      seen.delete(child);
    }
    return;
  }

  const node = child as { type?: unknown; props?: unknown };
  if (typeof node !== "object" || typeof node.type === "undefined") {
    yield renderPrimitive(child);
    return;
  }

  if (node.type === Fragment) {
    yield* walk(
      (node.props as { children?: unknown } | undefined)?.children,
      depth,
      seen,
      signal,
    );
    return;
  }

  if (typeof node.type === "function") {
    if (depth >= MAX_COMPONENT_DEPTH) {
      throw new Error(
        `component recursion exceeded ${MAX_COMPONENT_DEPTH} levels: check for a component rendering itself`,
      );
    }
    const name =
      (node.type as { name?: string }).name || "<anonymous component>";
    let result: unknown;
    try {
      result = (node.type as (props: unknown) => unknown)(node.props);
    } catch (cause) {
      if (cause instanceof ComponentRenderError) throw cause;
      throw new ComponentRenderError(name, cause);
    }
    if (isPromiseLike(result)) {
      const resolved = await result;
      yield* walk(resolved, depth + 1, seen, signal);
      return;
    }
    yield* walk(result, depth + 1, seen, signal);
    return;
  }

  const tag = String(node.type);
  const props = (node.props ?? {}) as Record<string, unknown>;

  if (isVoidElement(tag)) {
    yield `<${tag}${renderAttributes(props)}>`;
    return;
  }

  if (isRawTextElement(tag)) {
    const text = props.children;
    yield `<${tag}${renderAttributes(props)}>`;
    if (typeof text === "string") {
      yield serializeRawText(tag, text);
    } else {
      yield* walk(text, depth, seen, signal);
    }
    yield `</${tag}>`;
    return;
  }

  yield `<${tag}${renderAttributes(props)}>`;
  yield* walk(props.children, depth, seen, signal);
  yield `</${tag}>`;
}

/**
 * Renders the tree into a UTF-8 ReadableStream with byte-accounted
 * backpressure: the stream pulls one walker segment at a time and stops
 * pulling while the consumer is behind by more than `chunkBytes`, so a slow
 * consumer throttles rendering rather than growing memory.
 */
export function renderToStream(
  tree: unknown,
  options: RenderToStreamOptions = {},
): RenderStream {
  const chunkBytes = options.chunkBytes ?? DEFAULT_CHUNK_BYTES;

  // Internal controller: fires on the caller's signal OR consumer cancel.
  const internal = new AbortController();
  const forward = (reason: unknown): void => {
    if (!internal.signal.aborted) internal.abort(reason);
  };
  if (options.signal !== undefined) {
    if (options.signal.aborted) forward(options.signal.reason);
    else {
      options.signal.addEventListener(
        "abort",
        () => forward(options.signal!.reason),
        { once: true },
      );
    }
  }

  let bytesWritten = 0;
  let settled = false;
  let settleFinished: ((error?: unknown) => void) | undefined;
  const finished = new Promise<void>((resolve, reject) => {
    settleFinished = (error?: unknown) => {
      if (settled) return;
      settled = true;
      if (error === undefined) resolve();
      else reject(error);
    };
  });
  // Callers may observe failures through the stream alone; keep an un-awaited
  // `finished` from surfacing as an unhandled rejection.
  finished.catch(() => undefined);

  const iterator = walk(tree, 0, new Set(), internal.signal)[
    Symbol.asyncIterator
  ]();

  const stream = new ReadableStream<Uint8Array>(
    {
      async pull(controller): Promise<void> {
        try {
          throwIfAborted(internal.signal);
          const { done, value } = await iterator.next();
          if (done) {
            controller.close();
            settleFinished?.();
            return;
          }
          const bytes = encoder.encode(value);
          bytesWritten += bytes.byteLength;
          controller.enqueue(bytes);
        } catch (error) {
          controller.error(new StreamRenderError(error, bytesWritten));
          settleFinished?.(new StreamRenderError(error, bytesWritten));
        }
      },
      cancel(reason): void {
        // Consumer went away: stop the walk; swallow the eventual settlement
        // of whatever the walker was awaiting (non-signal-aware child work
        // cannot be force-cancelled — platform limit, documented).
        forward(reason);
        void iterator.next().catch(() => undefined);
        settleFinished?.(new RenderCancelledError(reason));
      },
    },
    new ByteLengthQueuingStrategy({ highWaterMark: chunkBytes }),
  );

  return { stream, finished };
}

/** A streaming Response carrying its render's `finished` promise. */
export type StreamingResponse = Response & {
  /** Settles when the body render completes, fails, aborts, or is cancelled. */
  readonly finished: Promise<void>;
};

/**
 * Streaming Response with `text/html; charset=utf-8`. Once the first chunk
 * flushes the status line is committed: mid-stream failures truncate the
 * body and reject `finished` with `StreamRenderError` (its `bytesWritten`
 * says whether commit already happened) — a replacement status cannot be
 * sent after that point.
 */
export function streamResponse(
  tree: unknown,
  options: StreamResponseOptions = {},
): StreamingResponse {
  const { status, headers, signal } = options;
  const render = renderToStream(tree, { signal });
  const responseHeaders = new Headers(headers);
  if (!responseHeaders.has("content-type")) {
    responseHeaders.set("content-type", "text/html; charset=utf-8");
  }
  const response = new Response(render.stream, {
    status: status ?? 200,
    headers: responseHeaders,
  }) as StreamingResponse;
  return Object.assign(response, { finished: render.finished });
}
