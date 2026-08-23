/**
 * Application lifecycle (BR-057).
 *
 * A small explicit state machine around resource initialization,
 * readiness, draining, and cleanup — no DI container, no hook matrix.
 *
 * Ordering contract:
 *   start:  resources initialize IN REGISTRATION ORDER; a failure rolls
 *           back already-started resources in REVERSE order, then rethrows.
 *   ready:  false until every mandatory resource has started.
 *   drain:  marks the app as not-accepting, then waits (bounded by
 *           shutdownDeadlineMs) for tracked in-flight work.
 *   stop:   idempotent — drain → abort remaining work → resources stop in
 *           reverse registration order → ready=false. Repeated calls are
 *           deterministic no-ops.
 *
 * Signals are wired through an injectable registrar so tests never send
 * real process signals.
 */
import type { Context } from "./context";

export interface LifecycleResource {
  readonly name: string;
  start?: () => Promise<void> | void;
  stop?: () => Promise<void> | void;
}

export interface LifecycleHooks {
  /**
   * Called when draining begins: the application should stop accepting new
   * connections (e.g. `server.stop(false)`). Never called twice.
   */
  readonly beginDrain?: () => void;
  /** Called after the deadline expires while work is still in flight. */
  readonly abortRemaining?: () => void;
}

export interface LifecycleOptions {
  /** Bounded drain window for in-flight completion (default 10_000 ms). */
  readonly shutdownDeadlineMs?: number;
  readonly hooks?: LifecycleHooks;
  /**
   * Test seam: installs signal handlers. Defaults to real process signals;
   * returns an unregister function.
   */
  readonly registerSignals?: (
    handler: (signal: "SIGINT" | "SIGTERM") => void,
  ) => () => void;
}

export type LifecycleState =
  "idle" | "starting" | "ready" | "draining" | "stopped";

export class LifecycleStartError extends Error {
  readonly resource: string;
  public constructor(resource: string, cause: unknown) {
    super(`lifecycle start failed at resource \`${resource}\``);
    this.resource = resource;
    this.cause = cause;
    this.name = "LifecycleStartError";
  }
}

const DEFAULT_DEADLINE_MS = 10_000;

export class Lifecycle {
  #state: LifecycleState = "idle";
  readonly #resources: LifecycleResource[] = [];
  readonly #inFlight = new Set<Promise<unknown>>();
  readonly #options: LifecycleOptions;

  constructor(options: LifecycleOptions = {}) {
    this.#options = options;
  }

  get state(): LifecycleState {
    return this.#state;
  }

  /** True only when every mandatory resource has completed startup. */
  get ready(): boolean {
    return this.#state === "ready";
  }

  /** Routes may consult this to reject work during drain/stop. */
  get acceptingWork(): boolean {
    return (
      this.#state === "idle" ||
      this.#state === "starting" ||
      this.#state === "ready"
    );
  }

  register(resource: LifecycleResource): this {
    if (this.#state !== "idle") {
      throw new Error(
        `cannot register "${resource.name}" after lifecycle start (state: ${this.#state})`,
      );
    }
    this.#resources.push(resource);
    return this;
  }

  /** Tracks one unit of in-flight request work. Returns a release function. */
  beginWork(): () => void {
    let release: () => void = () => {};
    const promise = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.#inFlight.add(promise);
    return () => {
      release();
      this.#inFlight.delete(promise);
    };
  }

  /**
   * Starts all registered resources in order. On failure, resources that
   * already started are stopped in reverse order before rethrowing.
   */
  async start(): Promise<void> {
    if (this.#state !== "idle") {
      throw new Error(`lifecycle.start called in state ${this.#state}`);
    }
    this.#state = "starting";
    const started: LifecycleResource[] = [];
    try {
      for (const resource of this.#resources) {
        await resource.start?.();
        started.push(resource);
      }
    } catch (cause) {
      const failing = this.#resources[started.length]?.name ?? "<unknown>";
      for (const resource of started.reverse()) {
        try {
          await resource.stop?.();
        } catch {
          // rollback errors must not mask the original startup failure
        }
      }
      this.#state = "stopped";
      throw new LifecycleStartError(failing, cause);
    }
    this.#state = "ready";
  }

  /**
   * Stops accepting new work, then waits up to the deadline for tracked
   * in-flight work to finish. Aborts (clears) whatever remains.
   */
  async drain(): Promise<void> {
    if (this.#state !== "ready") return;
    this.#state = "draining";
    this.#options.hooks?.beginDrain?.();

    const deadlineMs = this.#options.shutdownDeadlineMs ?? DEFAULT_DEADLINE_MS;
    if (this.#inFlight.size > 0) {
      const allSettled = Promise.allSettled([...this.#inFlight]);
      let timedOut = false;
      await Promise.race([
        allSettled.then(() => undefined),
        new Promise<void>((resolve) => {
          const timer = setTimeout(() => {
            timedOut = true;
            resolve();
          }, deadlineMs);
          // never keep the process alive just for the drain timer
          typeof timer === "object" && "unref" in timer
            ? timer.unref()
            : undefined;
        }),
      ]);
      if (timedOut && this.#inFlight.size > 0) {
        this.#options.hooks?.abortRemaining?.();
        this.#inFlight.clear();
      }
    }
  }

  /** Idempotent full shutdown: drain, then stop resources in reverse. */
  async stop(): Promise<void> {
    if (this.#state === "stopped") return;
    if (this.#state === "draining") {
      // stop() called from within drain completion: proceed to cleanup.
    } else if (this.#state === "ready" || this.#state === "starting") {
      await this.drain();
    } else if (this.#state === "idle") {
      this.#state = "stopped";
      return;
    }
    for (const resource of [...this.#resources].reverse()) {
      try {
        await resource.stop?.();
      } catch {
        // cleanup continues deterministically past individual failures
      }
    }
    this.#state = "stopped";
    this.#inFlight.clear();
  }

  /**
   * Wires SIGINT/SIGTERM through the injectable registrar. Returns the
   * unregister function so tests never touch real signals.
   */
  attachSignals(
    registerSignals: (
      handler: (signal: "SIGINT" | "SIGTERM") => void,
    ) => () => void = (handler) => {
      const listener = (signal: NodeJS.Signals) => handler(signal as "SIGINT");
      process.on("SIGINT", listener);
      process.on("SIGTERM", listener);
      return () => {
        process.off("SIGINT", listener);
        process.off("SIGTERM", listener);
      };
    },
  ): () => void {
    return registerSignals(() => {
      void this.stop();
    });
  }
}
