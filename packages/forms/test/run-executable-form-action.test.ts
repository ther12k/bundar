import { describe, expect, test } from "bun:test";
import { createContext, type Context } from "@bundar/core";
import type { ExecutableFormActionDefinition } from "../src/index";
import { executeExecutableFormAction } from "../src/run-executable-form-action";
import { recordingAdapter } from "./adapters";

/** Standard Schema fixture validating to a fixed scalar. */
function okSchema(): never {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: () => ({ value: { email: "ada@example.test" } }),
    },
  } as never;
}

/** Standard Schema fixture that always rejects. */
function failingSchema(): never {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: () => ({
        issues: [{ path: ["email"], message: "must be an email" }],
      }),
    },
  } as never;
}

/** Minimal Input/Result definition fixture with call + order tracking. */
function trackedDefinition(
  options: {
    run?: (input: { email: string }, context: unknown) => unknown;
    buildFragment?: (result: unknown, context: unknown) => unknown;
  } = {},
): {
  definition: ExecutableFormActionDefinition<{ email: string }, { id: number }>;
  events: string[];
} {
  const events: string[] = [];
  const definition: ExecutableFormActionDefinition<
    { email: string },
    { id: number }
  > = {
    schema: okSchema(),
    run: (input, context) => {
      events.push("run");
      return options.run
        ? (options.run(input, context) as { id: number })
        : { id: input.email.length };
    },
    buildFragment: (result, context) => {
      events.push("fragment");
      return options.buildFragment
        ? options.buildFragment(result, context)
        : `user:${String((result as { id: number }).id)}`;
    },
    renderForm: () => null,
  };
  return { definition, events };
}

function postContext(
  url: string,
  hooks: { signal?: AbortSignal } = {},
): Context {
  return createContext(
    new Request(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "email=ada%40example.test",
    }),
    {},
    hooks,
  );
}

describe("GH-181 executable form-action executor", () => {
  test("valid submission: begin → run once → fragment → commit, in order", async () => {
    const { definition, events } = trackedDefinition();
    const transaction = {
      begin: () => {
        events.push("begin");
        return "handle";
      },
      commit: () => {
        events.push("commit");
      },
      rollback: () => {
        events.push("rollback");
      },
    };
    const context = postContext("http://test/ok");
    const adapter = recordingAdapter();
    const outcome = await executeExecutableFormAction(
      context,
      { ...definition, transaction },
      adapter,
    );
    expect(outcome.kind).toBe("valid");
    // rendering happens before commit so a render failure can roll back
    expect(events).toEqual(["begin", "run", "fragment", "commit"]);
    expect(adapter.valids[0]?.fragment).toBe("user:16");
    expect(adapter.valids[0]?.delivery).toEqual({});
  });

  test("valid asynchronous run and fragment resolve exactly once", async () => {
    const { definition, events } = trackedDefinition({
      run: async (input) => {
        await Promise.resolve();
        return { id: input.email.length + 100 };
      },
      buildFragment: async (result) => {
        await Promise.resolve();
        return `async:${String((result as { id: number }).id)}`;
      },
    });
    const adapter = recordingAdapter();
    const outcome = await executeExecutableFormAction(
      postContext("http://test/async"),
      definition,
      adapter,
    );
    expect(outcome.kind).toBe("valid");
    expect(events).toEqual(["run", "fragment"]);
    expect(adapter.valids[0]?.fragment).toBe("async:116");
  });

  test("invalid input never runs the mutation nor opens a transaction", async () => {
    const { definition, events } = trackedDefinition();
    let began = false;
    const context = postContext("http://test/bad");
    const adapter = recordingAdapter();
    const outcome = await executeExecutableFormAction(
      context,
      {
        ...definition,
        schema: failingSchema(),
        transaction: {
          begin: () => {
            began = true;
            return "h";
          },
          commit: () => {},
          rollback: () => {},
        },
      },
      adapter,
    );
    expect(outcome.kind).toBe("invalid");
    expect(began).toBe(false);
    expect(events).toEqual([]);
    expect(adapter.invalids[0]?.status).toBe(422);
    expect(adapter.invalids[0]?.message).toBe("Validation failed");
  });

  test("run() failure rolls back exactly once, rethrows, never commits", async () => {
    let rollbacks = 0;
    let commits = 0;
    const failure = new Error("db constraint");
    const { definition } = trackedDefinition({
      run: () => {
        throw failure;
      },
    });
    const adapter = recordingAdapter();
    let caught: unknown;
    await executeExecutableFormAction(
      postContext("http://test/run-fail"),
      {
        ...definition,
        transaction: {
          begin: () => "h",
          commit: () => {
            commits += 1;
          },
          rollback: () => {
            rollbacks += 1;
          },
        },
      },
      adapter,
    ).catch((error: unknown) => {
      caught = error;
    });
    expect(caught).toBe(failure);
    expect(commits).toBe(0);
    expect(rollbacks).toBe(1);
  });

  test("fragment-render failure rolls back exactly once, rethrows, never commits", async () => {
    let rollbacks = 0;
    let commits = 0;
    const failure = new Error("render boom");
    const { definition } = trackedDefinition({
      buildFragment: () => {
        throw failure;
      },
    });
    const adapter = recordingAdapter();
    let caught: unknown;
    await executeExecutableFormAction(
      postContext("http://test/render-fail"),
      {
        ...definition,
        transaction: {
          begin: () => "h",
          commit: () => {
            commits += 1;
          },
          rollback: () => {
            rollbacks += 1;
          },
        },
      },
      adapter,
    ).catch((error: unknown) => {
      caught = error;
    });
    expect(caught).toBe(failure);
    expect(commits).toBe(0);
    expect(rollbacks).toBe(1);
  });

  test("abort before the pipeline prevents begin, run, and delivery (BR-058)", async () => {
    const controller = new AbortController();
    controller.abort(new Error("deadline"));
    const { definition, events } = trackedDefinition();
    let adapterCalled = false;
    const adapter = {
      invalid: async () => {
        adapterCalled = true;
        return new Response("invalid");
      },
      valid: async () => {
        adapterCalled = true;
        return new Response("valid");
      },
    };
    const outcome = await executeExecutableFormAction(
      postContext("http://test/pre-aborted", { signal: controller.signal }),
      definition,
      adapter,
    ).catch((error: unknown) => ({ aborted: String(error) }));
    expect(events).toEqual([]);
    expect(adapterCalled).toBe(false);
    expect((outcome as { aborted?: string }).aborted).toContain("deadline");
  });

  test("abort after validation stops before the transaction opens", async () => {
    const controller = new AbortController();
    const schema = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => {
          controller.abort(new Error("cancelled mid-flight"));
          return { value: { email: "ada@example.test" } };
        },
      },
    } as never;
    const { definition, events } = trackedDefinition();
    let began = false;
    const outcome = await executeExecutableFormAction(
      postContext("http://test/abort-after-validate", {
        signal: controller.signal,
      }),
      {
        ...definition,
        schema,
        transaction: {
          begin: () => {
            began = true;
            return "h";
          },
          commit: () => {},
          rollback: () => {},
        },
      },
      recordingAdapter(),
    ).catch((error: unknown) => ({ aborted: String(error) }));
    expect(began).toBe(false);
    expect(events).toEqual([]);
    expect((outcome as { aborted?: string }).aborted).toContain(
      "cancelled mid-flight",
    );
  });

  test("abort between run and fragment routes through rollback (no commit lie)", async () => {
    const controller = new AbortController();
    let rollbacks = 0;
    let commits = 0;
    const { definition } = trackedDefinition({
      run: () => {
        controller.abort(new Error("gone after run"));
        return { id: 1 };
      },
    });
    const outcome = await executeExecutableFormAction(
      postContext("http://test/abort-after-run", {
        signal: controller.signal,
      }),
      {
        ...definition,
        transaction: {
          begin: () => "h",
          commit: () => {
            commits += 1;
          },
          rollback: () => {
            rollbacks += 1;
          },
        },
      },
      recordingAdapter(),
    ).catch((error: unknown) => ({ aborted: String(error) }));
    expect((outcome as { aborted?: string }).aborted).toContain(
      "gone after run",
    );
    expect(commits).toBe(0);
    expect(rollbacks).toBe(1);
  });

  test("buildFragment receives the exact Result object run returned", async () => {
    const domainResult = { id: 42, nested: { tag: "exact" } };
    const { definition } = trackedDefinition({
      run: () => domainResult,
    });
    let fragmentArg: unknown;
    const adapter = recordingAdapter();
    await executeExecutableFormAction(
      postContext("http://test/identity"),
      {
        ...definition,
        buildFragment: (result) => {
          fragmentArg = result;
          return "f";
        },
      },
      adapter,
    );
    // exact identity: no serialization, clone, or normalization in between
    expect(fragmentArg).toBe(domainResult);
    expect(adapter.valids[0]?.fragment).toBe("f");
  });

  test("run and buildFragment receive the same workflow context object", async () => {
    const context = postContext("http://test/context");
    const { definition } = trackedDefinition();
    let runContext: unknown;
    let fragmentContext: unknown;
    await executeExecutableFormAction(
      context,
      {
        ...definition,
        run: (_input, runCtx) => {
          runContext = runCtx;
          return { id: 1 };
        },
        buildFragment: (_result, fragmentCtx) => {
          fragmentContext = fragmentCtx;
          return "f";
        },
      },
      recordingAdapter(),
    );
    expect(runContext).toBe(fragmentContext);
    expect(runContext).toBe(context);
  });

  test("abort during async fragment rendering rolls back (no commit lie)", async () => {
    const controller = new AbortController();
    let commits = 0;
    let rollbacks = 0;
    const { definition } = trackedDefinition({
      buildFragment: async () => {
        await Promise.resolve();
        controller.abort(new Error("gone during rendering"));
        return "<li>late</li>";
      },
    });
    const adapter = recordingAdapter();
    const outcome = await executeExecutableFormAction(
      postContext("http://test/abort-during-render", {
        signal: controller.signal,
      }),
      {
        ...definition,
        transaction: {
          begin: () => "handle",
          commit: () => {
            commits += 1;
          },
          rollback: () => {
            rollbacks += 1;
          },
        },
      },
      adapter,
    ).catch((error: unknown) => ({ aborted: String(error) }));
    // the builder resolved AFTER aborting — the checkpoint between
    // rendering and commit must still route the abort through rollback
    expect((outcome as { aborted?: string }).aborted).toContain(
      "gone during rendering",
    );
    expect(commits).toBe(0);
    expect(rollbacks).toBe(1);
    expect(adapter.valids).toHaveLength(0);
  });
});
