/**
 * GH-184 differential conformance: the legacy `runFormAction()` surface and
 * the `defineFormAction()`/`createFormActions().execute()` facade must be
 * EXTERNALLY EQUIVALENT for the same scenario definition — same body,
 * schema, business mutation, result renderer, invalid renderers,
 * transaction, dialect, and delivery options.
 *
 * One shared fixture executes each scenario through BOTH surfaces and the
 * complete observations are compared (status/statusText, canonical full
 * header set, exact body bytes, thrown error name/message, transaction
 * event sequence, mutation count, retained safe values, first error field).
 * Two independently-written test suites could both be green while encoding
 * two different behaviors; this file cannot.
 */
import { describe, expect, test } from "bun:test";
import { createContext } from "@bundar/core";
import { jsx } from "@bundar/jsx";
import type {
  FormTransaction,
  FormWorkflowContext,
  InvalidFormRender,
} from "@bundar/forms";
import type { StandardSchema } from "@bundar/schema";
import {
  createFormActions,
  defineFormAction,
  runFormAction,
} from "../src/index";
import type { FormActionDefinition, InvalidFormView } from "../src/index";
import type { PublicErrorView } from "../src/error-view";
import { htmx2 } from "../src/dialects/v2";

class DomainFailure extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "DomainFailure";
  }
}

interface ResponseSnapshot {
  readonly status: number;
  readonly statusText: string;
  readonly headers: readonly (readonly [string, string])[];
  readonly body: readonly number[];
}

interface WorkflowObservation {
  readonly outcomeKind: "valid" | "invalid" | "error";
  readonly response?: ResponseSnapshot;
  readonly error?: { readonly name: string; readonly message: string };
  readonly events: readonly string[];
  readonly mutationCount: number;
  readonly firstErrorField?: string | null;
  readonly retained?: Readonly<Record<string, string | string[]>>;
}

async function snapshotResponse(response: Response): Promise<ResponseSnapshot> {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: [...response.headers.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    ),
    body: [...new Uint8Array(await response.arrayBuffer())],
  };
}

type ScenarioConfig = {
  /** Abort fired inside the shared mutation, which then throws the reason. */
  readonly abortDuringExecution?: boolean;
  /** Abort fired inside async validation. */
  readonly abortDuringValidation?: boolean;
  /** Abort fired inside async rendering; the renderer resolves afterwards. */
  readonly abortDuringRendering?: boolean;
  /** The shared mutation throws a DomainFailure with this message. */
  readonly mutationThrows?: string;
  /** The shared result renderer throws with this message. */
  readonly fragmentThrows?: string;
  /** Schema rejects with the ordered multi-field + global issue set. */
  readonly orderedErrors?: boolean;
  /** Non-default enhanced delivery: 201 + privateContent + directive. */
  readonly richDelivery?: boolean;
};

function createScenario(config: ScenarioConfig = {}) {
  const events: string[] = [];
  let mutationCount = 0;
  let firstErrorField: string | null | undefined;
  let retained: Record<string, string | string[]> | undefined;
  let facadeField:
    | {
        value: string | undefined;
        values: readonly string[];
        multiple: boolean;
      }
    | undefined;
  const controller = new AbortController();

  const transaction: FormTransaction = {
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

  const mutate = async (input: { title: string }) => {
    events.push("mutate");
    mutationCount += 1;
    if (config.abortDuringExecution) {
      controller.abort(new Error("gone during execution"));
      throw new Error("gone during execution");
    }
    if (config.mutationThrows !== undefined) {
      throw new DomainFailure(config.mutationThrows);
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    return { id: 42, title: input.title };
  };

  const renderTodo = async (todo: { id: number; title: string }) => {
    events.push("fragment");
    if (config.abortDuringRendering) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      controller.abort(new Error("gone during rendering"));
    }
    if (config.fragmentThrows !== undefined) {
      throw new Error(config.fragmentThrows);
    }
    return jsx("li", { id: `todo-${String(todo.id)}`, children: todo.title });
  };

  const sharedInvalidFragment = (render: InvalidFormRender) => {
    events.push("invalidFragment");
    firstErrorField = render.firstErrorField;
    retained = { ...render.submitted };
    const fieldAccessor = (render as Partial<InvalidFormView>).field;
    if (typeof fieldAccessor === "function") {
      const view = fieldAccessor("title");
      facadeField = {
        value: view.value,
        values: [...view.values],
        multiple: view.multiple,
      };
    }
    const title = render.submitted["title"];
    const titleText = Array.isArray(title) ? title.join("|") : (title ?? "");
    const titleErrors = (render.errors.fields["title"] ?? []).join("#");
    return jsx("p", {
      id: "form-region",
      children: [
        jsx("span", {
          id: "focus",
          children: render.firstErrorField ?? "none",
        }),
        jsx("span", { id: "title-value", children: titleText }),
        jsx("span", { id: "title-errors", children: titleErrors }),
        jsx("span", {
          id: "global-count",
          children: String(render.errors.global.length),
        }),
      ],
    });
  };

  const sharedInvalidDocument = (
    render: InvalidFormRender,
    view: PublicErrorView,
  ) => {
    events.push("invalidDocument");
    firstErrorField = render.firstErrorField;
    retained = { ...render.submitted };
    return jsx("html", {
      children: jsx("body", {
        children: [
          jsx("h1", { children: `Error ${String(view.status)}` }),
          jsx("p", {
            id: "doc-field",
            children: render.firstErrorField ?? "none",
          }),
        ],
      }),
    });
  };

  const schema: StandardSchema<unknown, { title: string }> = {
    "~standard": {
      version: 1,
      vendor: "conformance",
      validate: async (value: unknown) => {
        if (config.abortDuringValidation) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          controller.abort(new Error("gone during validation"));
        }
        const record = value as Record<string, unknown>;
        if (config.orderedErrors) {
          return {
            issues: [
              { message: "first title error", path: ["title"] },
              { message: "description error", path: ["description"] },
              { message: "second title error", path: ["title"] },
              { message: "form-level error", path: [] },
            ],
          };
        }
        if (typeof record.title !== "string" || record.title.length < 2) {
          return {
            issues: [{ message: "Title too short", path: ["title"] }],
          };
        }
        return { value: { title: record.title } };
      },
    },
  };

  const legacyDefinition: FormActionDefinition<{ title: string }> = {
    schema,
    action: {
      fragment: async (input) => {
        const result = await mutate(input);
        return renderTodo(result);
      },
      ...(config.richDelivery
        ? {
            status: 201 as const,
            privateContent: true,
            directives: [
              { kind: "trigger", events: [{ name: "todoCreated" }] },
            ] as const,
          }
        : {}),
      redirectTo: "/todos",
    },
    renderForm: sharedInvalidFragment,
    renderInvalidDocument: sharedInvalidDocument,
    formTarget: "#todo-form",
    transaction,
  };

  const facadeDefinition = defineFormAction({
    schema,
    run: (input) => mutate(input),
    success: {
      fragment: (result) => renderTodo(result),
      redirectTo: "/todos",
      ...(config.richDelivery
        ? {
            status: 201 as const,
            privateContent: true,
            directives: [
              { kind: "trigger", events: [{ name: "todoCreated" }] },
            ] as const,
          }
        : {}),
    },
    invalid: {
      fragment: sharedInvalidFragment,
      document: sharedInvalidDocument,
      target: "#todo-form",
    },
    transaction,
  });

  const state = {
    get events(): readonly string[] {
      return events;
    },
    get mutationCount(): number {
      return mutationCount;
    },
    get invalidSeen(): boolean {
      return firstErrorField !== undefined;
    },
    get firstErrorField(): string | null {
      return firstErrorField ?? null;
    },
    get retained(): Record<string, string | string[]> {
      return retained ?? {};
    },
    get facadeField() {
      return facadeField;
    },
  };

  const facade = createFormActions({ dialect: htmx2 });

  const formContext = (
    body: string,
    headers: Record<string, string> = {},
    signal?: AbortSignal,
  ): FormWorkflowContext =>
    createContext(
      new Request("http://localhost/todos", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          ...headers,
        },
        body,
      }),
      {} as Record<string, string>,
      signal !== undefined ? { signal } : {},
    );

  const observe = async (
    run: Promise<{
      kind: "valid" | "invalid";
      response: Response;
    }>,
  ): Promise<WorkflowObservation> => {
    try {
      const outcome = await run;
      const base: WorkflowObservation = {
        outcomeKind: outcome.kind,
        response: await snapshotResponse(outcome.response),
        events: state.events,
        mutationCount: state.mutationCount,
      };
      return state.invalidSeen
        ? {
            ...base,
            firstErrorField: state.firstErrorField,
            retained: state.retained,
          }
        : base;
    } catch (error) {
      return {
        outcomeKind: "error",
        error: {
          name: (error as Error).name,
          message: (error as Error).message,
        },
        events: state.events,
        mutationCount: state.mutationCount,
      };
    }
  };

  return {
    controller,
    state,
    facade,
    /**
     * Executes the scenario through BOTH surfaces, each with its own fresh
     * scenario state and fresh request — a Request body is never reused and
     * the two runs never share mutable state.
     */
    runPaired: async (
      body: string,
      headers: Record<string, string> = {},
    ): Promise<{
      legacy: WorkflowObservation;
      facade: WorkflowObservation;
      facadeState: typeof state;
    }> => {
      const legacyScenario = createScenario(config);
      const facadeScenario = createScenario(config);
      return {
        legacy: await legacyScenario.legacy(body, headers),
        facade: await facadeScenario.facadeRun(body, headers),
        facadeState: facadeScenario.state,
      };
    },
    /** Executes the scenario through the LEGACY surface with a fresh request. */
    legacy: (
      body: string,
      headers: Record<string, string> = {},
      signal?: AbortSignal,
    ): Promise<WorkflowObservation> =>
      observe(
        runFormAction(formContext(body, headers, signal), legacyDefinition, {
          dialect: htmx2,
        }) as never,
      ),
    /** Executes the SAME scenario through the FACADE with a fresh request. */
    facadeRun: (
      body: string,
      headers: Record<string, string> = {},
      signal?: AbortSignal,
    ): Promise<WorkflowObservation> =>
      observe(
        facade.execute(formContext(body, headers, signal), facadeDefinition),
      ),
    formContext,
    facadeDefinition,
    legacyDefinition,
  };
}

function headerOf(
  snapshot: ResponseSnapshot | undefined,
  name: string,
): string | null {
  const found = snapshot?.headers.find(([key]) => key === name);
  return found ? found[1] : null;
}

describe("GH-184 legacy/facade conformance", () => {
  test("ordinary valid: identical 303 PRG delivery and transaction sequence", async () => {
    const scenario = createScenario();
    const { legacy, facade } = await scenario.runPaired("title=write+tests");
    expect(facade).toEqual(legacy);
    expect(legacy.outcomeKind).toBe("valid");
    expect(legacy.response?.status).toBe(303);
    expect(headerOf(legacy.response, "location")).toBe("/todos");
    expect(legacy.response?.body.length).toBe(0);
    // PRG redirects carry neither negotiation Vary nor cache policy
    expect(headerOf(legacy.response, "vary")).toBeNull();
    expect(headerOf(legacy.response, "cache-control")).toBeNull();
    expect(legacy.events).toEqual(["begin", "mutate", "fragment", "commit"]);
    expect(legacy.mutationCount).toBe(1);
  });

  test("enhanced valid: identical 201 fragment bytes, directives, Vary, cache", async () => {
    const scenario = createScenario({ richDelivery: true });
    const { legacy, facade } = await scenario.runPaired("title=write+tests", {
      "HX-Request": "true",
    });
    expect(facade).toEqual(legacy);
    expect(legacy.response?.status).toBe(201);
    expect(headerOf(legacy.response, "hx-trigger")).toContain("todoCreated");
    expect(headerOf(legacy.response, "location")).toBeNull();
    expect(headerOf(legacy.response, "vary")).toContain("HX-Request");
    expect(headerOf(legacy.response, "cache-control")).toContain("no-store");
    expect(legacy.response?.body.length).toBeGreaterThan(0);
    expect(legacy.events).toEqual(["begin", "mutate", "fragment", "commit"]);
    expect(legacy.mutationCount).toBe(1);
  });

  test("ordinary invalid: identical 422 application-document bytes", async () => {
    const scenario = createScenario();
    const { legacy, facade } = await scenario.runPaired("title=x");
    expect(facade).toEqual(legacy);
    expect(legacy.outcomeKind).toBe("invalid");
    expect(legacy.response?.status).toBe(422);
    expect(headerOf(legacy.response, "hx-retarget")).toBeNull();
    expect(headerOf(legacy.response, "vary")).toContain("HX-Request");
    expect(legacy.events).toEqual(["invalidDocument"]);
    expect(legacy.mutationCount).toBe(0);
    expect(legacy.firstErrorField).toBe("title");
    expect(legacy.retained?.["title"]).toBe("x");
  });

  test("enhanced invalid: identical 422 region bytes, retarget, reswap", async () => {
    const scenario = createScenario();
    const { legacy, facade } = await scenario.runPaired("title=x", {
      "HX-Request": "true",
    });
    expect(facade).toEqual(legacy);
    expect(legacy.response?.status).toBe(422);
    expect(headerOf(legacy.response, "hx-retarget")).toBe("#todo-form");
    expect(headerOf(legacy.response, "hx-reswap")).toBe("outerHTML");
    expect(headerOf(legacy.response, "vary")).toContain("HX-Request");
    expect(legacy.events).toEqual(["invalidFragment"]);
    expect(legacy.mutationCount).toBe(0);
  });

  test("retained values: duplicates observable, secrets dropped, field helper aligned", async () => {
    const scenario = createScenario();
    const body = "title=x&title=second&note=keep-me&password=never-retain-me";
    const headers = { "HX-Request": "true" };
    const { legacy, facade, facadeState } = await scenario.runPaired(
      body,
      headers,
    );
    expect(facade).toEqual(legacy);
    const retained = legacy.retained ?? {};
    expect(retained["title"]).toEqual(["x", "second"]);
    expect(retained["note"]).toBe("keep-me");
    expect("password" in retained).toBe(false);
    // facade-specific: field(name) built on GH-182, captured in the shared renderer
    const field = facadeState.facadeField;
    expect(field?.value).toBe("x");
    expect(field?.values).toEqual(["x", "second"]);
    expect(field?.multiple).toBe(true);
  });

  test("error ordering: first field, per-field order, global isolation in bytes", async () => {
    const scenario = createScenario({ orderedErrors: true });
    const { legacy, facade } = await scenario.runPaired(
      "title=ABC&description=ok",
      {
        "HX-Request": "true",
      },
    );
    expect(facade).toEqual(legacy);
    expect(legacy.firstErrorField).toBe("title");
    expect(legacy.retained?.["title"]).toBe("ABC");
    // decode the region bytes and assert the ordered/global rendering
    const body = Buffer.from(legacy.response?.body ?? []).toString("utf8");
    expect(body).toContain("first title error#second title error");
    expect(body).not.toContain("description error");
    expect(body).toContain('id="global-count">1<');
    expect(body).not.toContain("form-level error");
  });

  test("mutation failure: identical DomainFailure rollback observations", async () => {
    const scenario = createScenario({ mutationThrows: "cannot create todo" });
    const { legacy, facade } = await scenario.runPaired("title=write+tests");
    expect(facade).toEqual(legacy);
    expect(legacy.outcomeKind).toBe("error");
    expect(legacy.error?.name).toBe("DomainFailure");
    expect(legacy.error?.message).toBe("cannot create todo");
    expect(legacy.response).toBeUndefined();
    expect(legacy.events).toEqual(["begin", "mutate", "rollback"]);
    expect(legacy.mutationCount).toBe(1);
  });

  test("fragment failure: identical render-phase rollback observations", async () => {
    const scenario = createScenario({ fragmentThrows: "render exploded" });
    const { legacy, facade } = await scenario.runPaired("title=write+tests");
    expect(facade).toEqual(legacy);
    expect(legacy.outcomeKind).toBe("error");
    expect(legacy.error?.message).toBe("render exploded");
    expect(legacy.events).toEqual(["begin", "mutate", "fragment", "rollback"]);
    expect(legacy.mutationCount).toBe(1);
  });
});

describe("GH-184 cancellation conformance", () => {
  test("already aborted before parsing: identical rejection, nothing runs", async () => {
    const scenario = createScenario();
    scenario.controller.abort(new Error("deadline before work"));
    const legacy = await scenario.legacy(
      "title=write+tests",
      {},
      scenario.controller.signal,
    );
    const fresh = createScenario();
    fresh.controller.abort(new Error("deadline before work"));
    const facade = await fresh.facadeRun(
      "title=write+tests",
      {},
      fresh.controller.signal,
    );
    expect(facade).toEqual(legacy);
    expect(legacy.outcomeKind).toBe("error");
    expect(legacy.error?.message).toBe("deadline before work");
    expect(legacy.events).toEqual([]);
    expect(legacy.mutationCount).toBe(0);
  });

  test("abort during async validation: identical rejection before the transaction", async () => {
    const scenario = createScenario({ abortDuringValidation: true });
    const legacy = await scenario.legacy(
      "title=write+tests",
      {},
      scenario.controller.signal,
    );
    const fresh = createScenario({ abortDuringValidation: true });
    const facade = await fresh.facadeRun(
      "title=write+tests",
      {},
      fresh.controller.signal,
    );
    expect(facade).toEqual(legacy);
    expect(legacy.error?.message).toBe("gone during validation");
    expect(legacy.events).toEqual([]);
    expect(legacy.mutationCount).toBe(0);
  });

  test("abort during success execution: signal-aware mutation rolls back on both", async () => {
    const scenario = createScenario({ abortDuringExecution: true });
    const legacy = await scenario.legacy(
      "title=write+tests",
      {},
      scenario.controller.signal,
    );
    const fresh = createScenario({ abortDuringExecution: true });
    const facade = await fresh.facadeRun(
      "title=write+tests",
      {},
      fresh.controller.signal,
    );
    expect(facade).toEqual(legacy);
    expect(legacy.error?.message).toBe("gone during execution");
    expect(legacy.events).toEqual(["begin", "mutate", "rollback"]);
    expect(legacy.mutationCount).toBe(1);
  });

  test("abort during async fragment rendering: rollback exactly once on BOTH surfaces", async () => {
    // The facade checkpoints after fragment resolution; the legacy executor
    // historically committed right after buildFragment resolved. The paired
    // comparison forces both to the same contract: rollback, never commit.
    const scenario = createScenario({ abortDuringRendering: true });
    const legacy = await scenario.legacy(
      "title=write+tests",
      {},
      scenario.controller.signal,
    );
    const fresh = createScenario({ abortDuringRendering: true });
    const facade = await fresh.facadeRun(
      "title=write+tests",
      {},
      fresh.controller.signal,
    );
    expect(facade).toEqual(legacy);
    expect(legacy.outcomeKind).toBe("error");
    expect(legacy.error?.message).toBe("gone during rendering");
    expect(legacy.events).toEqual(["begin", "mutate", "fragment", "rollback"]);
    expect(legacy.mutationCount).toBe(1);
  });
});
