/**
 * Supervised child processes for the development command (GH-072).
 *
 * One place owns the dev-loop process model: spawn the child, keep its
 * diagnostics flowing (stdio inherited), forward SIGINT/SIGTERM to it,
 * guarantee cleanup (a grace period, then SIGKILL), and propagate the
 * child's exit code so failures surface instead of silently vanishing.
 */
import { type ChildProcess, spawn } from "node:child_process";

/** Node/Bun signal names the supervisor understands. */
export type SignalName =
  "SIGINT" | "SIGTERM" | "SIGKILL" | "SIGHUP" | "SIGQUIT" | "SIGABRT";

export interface SupervisedChildOptions {
  /** Milliseconds to wait after a signal before escalating to SIGKILL. */
  readonly shutdownGraceMs?: number;
  /** Injection point for tests (defaults to node:child_process spawn). */
  readonly spawnFn?: typeof spawn;
  /** Signals the supervisor forwards (defaults to INT and TERM). */
  readonly forwardedSignals?: readonly SignalName[];
}

export interface SupervisedChild {
  readonly pid: number | undefined;
  /** Resolves with the child's exit code once it has fully exited. */
  readonly exited: Promise<number>;
  /** Sends a signal through the supervisor's cleanup path. */
  signal(signal: SignalName): void;
  /** True once a forwarded signal initiated the shutdown (clean stop). */
  intentionallyStopped(): boolean;
}

const DEFAULT_FORWARDED: readonly SignalName[] = ["SIGINT", "SIGTERM"];
const DEFAULT_GRACE_MS = 5_000;

/**
 * Spawns a supervised child. The returned promise never rejects: exit
 * codes (including signal deaths, mapped to 128+signal) resolve so the
 * caller decides what failure means.
 */
export function superviseChild(
  command: string,
  args: readonly string[],
  options: SupervisedChildOptions & {
    readonly env?: Readonly<Record<string, string>>;
    readonly cwd?: string;
  } = {},
): SupervisedChild {
  const spawnFn = options.spawnFn ?? spawn;
  const graceMs = options.shutdownGraceMs ?? DEFAULT_GRACE_MS;
  const forwarded = options.forwardedSignals ?? DEFAULT_FORWARDED;

  const child: ChildProcess = spawnFn(command, [...args], {
    stdio: "inherit",
    env: options.env ? { ...process.env, ...options.env } : process.env,
    ...(options.cwd !== undefined ? { cwd: options.cwd } : {}),
  });

  let exitCode = -1;
  let exitSignalName: string | null = null;
  let killTimer: ReturnType<typeof setTimeout> | undefined;
  let stoppedIntentionally = false;
  let settling: ((code: number) => void) | undefined;
  const exited = new Promise<number>((resolve) => {
    settling = resolve;
  });

  const settle = (): void => {
    if (killTimer !== undefined) clearTimeout(killTimer);
    for (const signal of forwarded) {
      process.removeListener(signal, onParentSignalName);
    }
    const code =
      exitCode >= 0
        ? exitCode
        : exitSignalName !== null
          ? 128 + signalNumber(exitSignalName)
          : 1;
    settling?.(code);
  };

  const onParentSignalName = (parentSignalName: SignalName): void => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    stoppedIntentionally = true;
    child.kill(parentSignalName);
    // escalation: a wedged child must not outlive the dev command
    killTimer = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
      }
    }, graceMs);
    killTimer.unref?.();
  };

  child.once("exit", (code, signal) => {
    exitCode = code ?? -1;
    exitSignalName = signal;
    settle();
  });
  child.once("error", (error) => {
    console.error(`dev: failed to start ${command}: ${error.message}`);
    exitCode = 127;
    settle();
  });

  for (const signal of forwarded) {
    process.on(signal, onParentSignalName);
  }

  return {
    pid: child.pid,
    exited,
    signal: (signal) => onParentSignalName(signal),
    intentionallyStopped: () => stoppedIntentionally,
  };
}

const SIGNAL_NUMBERS: Readonly<Record<string, number>> = {
  SIGHUP: 1,
  SIGINT: 2,
  SIGQUIT: 3,
  SIGABRT: 6,
  SIGKILL: 9,
  SIGTERM: 15,
};

function signalNumber(signal: string): number {
  return SIGNAL_NUMBERS[signal] ?? 0;
}
