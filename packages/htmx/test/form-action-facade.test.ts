/**
 * GH-183 form-action facade tests: the presentation-layer adapter over the
 * separated neutral workflow. Proves type-driven definitions map onto
 * executeExecutableFormAction without behavior drift — PRG vs enhanced
 * fragments, 422 document/fragment negotiation, Vary/cache/retarget
 * semantics, exactly-once mutation, context identity, and legacy isolation.
 */
import { describe, expect, test } from "bun:test";
import { createContext } from "@bundar/core";
import { jsx } from "@bundar/jsx";
import type { FormWorkflowContext } from "@bundar/forms";
import type { StandardSchema } from "@bundar/schema";
import {
  createFormActions,
  defineFormAction,
  runFormAction,
} from "../src/index";
import type {
  FormActionDefinition,
  HtmxFormActionDefinition,
} from "../src/index";
import { htmx2 } from "../src/dialects/v2";

const todoSchema: StandardSchema<unknown, { title: string }> = {
  "~standard": {
    version: 1,
    vendor: "test",
    validate: (value) => {
      const record = value as Record<string, unknown>;
      if (typeof record.title !== "string" || record.title.length < 2) {
        return {
          issues: [{ message: "Title too short", path: ["title"] }],
        };
      }
      return { value: { title: record.title } };
    },
  },
};

function formContext(
  body: string,
  headers: Record<string, string> = {},
): FormWorkflowContext {
  return createContext(
    new Request("http://localhost/todos", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        ...headers,
      },
      body,
    }),
    {} as Record<string, string>,
  );
}

/** Spied definition fixture: every lifecycle stage is observable. */
function todoDefinition(
  overrides: Partial<
    HtmxFormActionDefinition<{ title: string }, { id: number; title: string }>
  > = {},
): HtmxFormActionDefinition<
  { title: string },
  { id: number; title: string }
> & {
  calls: {
    run: number;
    fragment: number;
    invalidFragment: number;
    document: number;
  };
  contexts: { run?: unknown; fragment?: unknown; invalid?: unknown };
} {
  const calls = { run: 0, fragment: 0, invalidFragment: 0, document: 0 };
  const contexts: { run?: unknown; fragment?: unknown; invalid?: unknown } = {};
  const definition: HtmxFormActionDefinition<
    { title: string },
    { id: number; title: string }
  > = {
    schema: todoSchema,
    run: (input, context) => {
      calls.run += 1;
      contexts.run = context;
      return { id: 42, title: input.title };
    },
    success: {
      fragment: (todo, context) => {
        calls.fragment += 1;
        contexts.fragment = context;
        return jsx("li", { id: "todo", children: todo.title });
      },
      redirectTo: "/todos",
    },
    invalid: {
      fragment: (render, context) => {
        calls.invalidFragment += 1;
        contexts.invalid = context;
        return jsx("p", {
          id: "title-error",
          children: render.field("title").error ?? "",
        });
      },
      target: "#todo-card",
    },
  };
  return {
    ...definition,
    ...overrides,
    calls,
    contexts,
  } as HtmxFormActionDefinition<
    { title: string },
    { id: number; title: string }
  > & {
    calls: {
      run: number;
      fragment: number;
      invalidFragment: number;
      document: number;
    };
    contexts: { run?: unknown; fragment?: unknown; invalid?: unknown };
  };
}

const facade = createFormActions({ dialect: htmx2 });

describe("GH-183 valid submissions", () => {
  test("ordinary: run once, PRG 303 with Location and empty body", async () => {
    const definition = todoDefinition();
    const outcome = await facade.execute(
      formContext("title=write+tests"),
      definition,
    );
    expect(outcome.kind).toBe("valid");
    expect(definition.calls.run).toBe(1);
    expect(definition.calls.fragment).toBe(1);
    expect(outcome.response.status).toBe(303);
    expect(outcome.response.headers.get("location")).toBe("/todos");
    expect(await outcome.response.text()).toBe("");
  });

  test("enhanced: fragment bytes, configured status, directives, Vary, no redirect", async () => {
    const definition = todoDefinition({
      success: {
        fragment: (todo) => jsx("li", { id: "todo", children: todo.title }),
        redirectTo: "/todos",
        status: 201,
        privateContent: true,
        directives: [{ kind: "trigger", events: [{ name: "todoCreated" }] }],
      },
    });
    const outcome = await facade.execute(
      formContext("title=write+tests", { "HX-Request": "true" }),
      definition,
    );
    expect(outcome.kind).toBe("valid");
    expect(outcome.response.status).toBe(201);
    expect(outcome.response.headers.get("location")).toBeNull();
    const body = await outcome.response.text();
    expect(body).toContain('id="todo"');
    expect(body).toContain("write tests");
    expect(outcome.response.headers.get("hx-trigger")).toContain("todoCreated");
    const vary = outcome.response.headers.get("vary") ?? "";
    expect(vary).toContain("HX-Request");
    const cacheControl = outcome.response.headers.get("cache-control") ?? "";
    expect(cacheControl).toContain("no-store");
  });
});

describe("GH-183 invalid submissions", () => {
  test("enhanced: 422 region fragment, field helper data, retarget + reswap", async () => {
    const definition = todoDefinition();
    const outcome = await facade.execute(
      formContext("title=x", { "HX-Request": "true" }),
      definition,
    );
    expect(outcome.kind).toBe("invalid");
    expect(definition.calls.run).toBe(0);
    expect(outcome.response.status).toBe(422);
    const body = await outcome.response.text();
    expect(body).toContain('id="title-error"');
    expect(body).toContain("Title too short");
    expect(outcome.response.headers.get("hx-retarget")).toBe("#todo-card");
    expect(outcome.response.headers.get("hx-reswap")).toBe("outerHTML");
  });

  test("enhanced: field(name) retains the submitted value safely", async () => {
    let retained: unknown;
    const definition = todoDefinition({
      invalid: {
        fragment: (render) => {
          retained = render.field("title").value;
          return jsx("p", { children: "region" });
        },
        target: "#todo-card",
      },
    });
    await facade.execute(
      formContext("title=x&other=kept", { "HX-Request": "true" }),
      definition,
    );
    expect(retained).toBe("x");
  });

  test("ordinary with application document: document renderer used, fragment untouched", async () => {
    let documentView: { status?: number } | undefined;
    const definition = todoDefinition({
      invalid: {
        fragment: () => jsx("p", { children: "region-only" }),
        document: (render, view, context) => {
          documentView = view;
          void render;
          void context;
          return jsx("html", {
            children: jsx("body", {
              children: jsx("h1", { children: "custom document" }),
            }),
          });
        },
        target: "#todo-card",
      },
    });
    const outcome = await facade.execute(formContext("title=x"), definition);
    expect(outcome.kind).toBe("invalid");
    expect(outcome.response.status).toBe(422);
    expect(documentView?.status).toBe(422);
    const body = await outcome.response.text();
    expect(body).toContain("custom document");
    expect(body).not.toContain("region-only");
    expect(definition.calls.invalidFragment).toBe(0);
  });

  test("ordinary without application document: generic fallback, no dangling field links", async () => {
    const definition = todoDefinition();
    const outcome = await facade.execute(formContext("title=x"), definition);
    expect(outcome.kind).toBe("invalid");
    expect(outcome.response.status).toBe(422);
    const body = await outcome.response.text();
    expect(body).toContain("Validation failed");
    expect(body).toContain("Title too short");
    // the generic document carries no field anchor links (links:false)
    expect(body).not.toContain('href="#');
    expect(definition.calls.invalidFragment).toBe(0);
  });
});

describe("GH-183 facade behavior", () => {
  test("dialect decode path is used for every request", async () => {
    let decodes = 0;
    const spyDialect = {
      ...htmx2,
      decodeRequest: (request: Request) => {
        decodes += 1;
        return htmx2.decodeRequest(request);
      },
    };
    const spied = createFormActions({ dialect: spyDialect });
    await spied.execute(
      formContext("title=write+tests", { "HX-Request": "true" }),
      todoDefinition(),
    );
    await spied.execute(formContext("title=x"), todoDefinition());
    expect(decodes).toBe(2);
  });

  test("handle() returns the Response directly", async () => {
    const handler = facade.handle(todoDefinition());
    const response = await handler(formContext("title=write+tests"));
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(303);
  });

  test("execute() preserves the discriminated outcome for invalid input", async () => {
    const outcome = await facade.execute(
      formContext("title=x"),
      todoDefinition(),
    );
    expect(outcome.kind).toBe("invalid");
    expect(outcome.response).toBeInstanceOf(Response);
  });

  test("the definition object is never mutated", async () => {
    const definition = todoDefinition();
    const successKeys = Object.keys(definition.success).sort();
    const invalidKeys = Object.keys(definition.invalid).sort();
    await facade.execute(
      formContext("title=write+tests", { "HX-Request": "true" }),
      definition,
    );
    await facade.execute(formContext("title=x"), definition);
    expect(Object.keys(definition.success).sort()).toEqual(successKeys);
    expect(Object.keys(definition.invalid).sort()).toEqual(invalidKeys);
    expect(Object.isFrozen(definition)).toBe(false);
  });

  test("the same context object reaches run, fragment, and invalid renderer", async () => {
    const definition = todoDefinition();
    const context = formContext("title=write+tests", { "HX-Request": "true" });
    await facade.execute(context, definition);
    expect(definition.contexts.run).toBe(context);
    expect(definition.contexts.fragment).toBe(context);
    const invalidContext = formContext("title=x", { "HX-Request": "true" });
    await facade.execute(invalidContext, definition);
    expect(definition.contexts.invalid).toBe(invalidContext);
  });

  test("transaction hooks still bracket the valid path", async () => {
    const calls: string[] = [];
    const definition = todoDefinition({
      transaction: {
        begin: () => {
          calls.push("begin");
          return "handle";
        },
        commit: () => {
          calls.push("commit");
        },
        rollback: () => {
          calls.push("rollback");
        },
      },
    });
    const outcome = await facade.execute(
      formContext("title=write+tests"),
      definition,
    );
    expect(outcome.kind).toBe("valid");
    expect(calls).toEqual(["begin", "commit"]);
  });
});

describe("GH-183 legacy isolation", () => {
  test("runFormAction still executes the legacy definition shape", async () => {
    let legacyRuns = 0;
    const legacy: FormActionDefinition<{ title: string }> = {
      schema: todoSchema,
      action: {
        fragment: (output) => jsx("p", { children: output.title }),
        redirectTo: "/legacy",
      },
      renderForm: () => jsx("p", { children: "legacy form" }),
    };
    const valid = await runFormAction(formContext("title=write+tests"), legacy);
    expect(valid.kind).toBe("valid");
    expect(valid.response.headers.get("location")).toBe("/legacy");
    const invalid = await runFormAction(
      formContext("title=x", { "HX-Request": "true" }),
      {
        ...legacy,
        action: {
          ...legacy.action,
          fragment: () => {
            legacyRuns += 1;
            return jsx("p", { children: "never" });
          },
        },
      },
    );
    expect(invalid.kind).toBe("invalid");
    expect(invalid.response.status).toBe(422);
    expect(legacyRuns).toBe(0);
  });

  test("defineFormAction output satisfies the facade definition type", () => {
    const definition = defineFormAction(todoDefinition());
    const schemaType: StandardSchema<unknown, { title: string }> =
      definition.schema;
    expect(schemaType).toBeDefined();
  });
});
