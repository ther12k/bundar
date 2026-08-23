import { describe, expect, test } from "bun:test";
import { createContext } from "@bundar/core";
import * as forms from "../src/index";
import { failingAdapter, recordingAdapter } from "./adapters";

describe("BR-014/015 @bundar/forms contracts and orchestration", () => {
  test("the frozen contract surface is exactly the intentional exports", () => {
    expect(Object.keys(forms).sort()).toEqual([
      "FORMS_CONTRACT_VERSION",
      "INVALID_SUBMISSION_STATUS",
      "executeFormAction",
      "isStandardSchemaLike",
      "resolveValidationAdapter",
      "standardSchemaAdapter",
      "validateForm",
      "validateHeaders",
      "validateJson",
      "validateParams",
      "validateQuery",
    ]);
  });

  test("invalid submissions carry field errors, retained values, focus hint", async () => {
    const schema = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (input: unknown) => {
          const value = input as Record<string, string>;
          if (value.email === undefined || !value.email.includes("@")) {
            return {
              issues: [
                { path: ["email"], message: "must be an email" },
                { path: ["email"], message: "is required" },
              ],
            };
          }
          return { value };
        },
      },
    } as never;
    const context = createContext(
      new Request("http://test/signup", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          email: "nope",
          display_name: "Ada",
        }).toString(),
      }),
      {},
    );
    const adapter = recordingAdapter();
    const outcome = await forms.executeFormAction(
      context,
      {
        schema,
        buildFragment: () => new Response("never"),
        renderForm: () => null,
      },
      adapter,
    );
    expect(outcome.kind).toBe("invalid");
    expect(adapter.invalids).toHaveLength(1);
    const delivery = adapter.invalids[0]!;
    expect(delivery.status).toBe(422);
    expect(delivery.render.firstErrorField).toBe("email");
    // retained safe values survive for re-rendering
    expect(delivery.render.submitted["display_name"]).toBe("Ada");
  });

  test("valid submissions resolve the fragment exactly once before commit", async () => {
    let builds = 0;
    let commits = 0;
    let rollbacks = 0;
    const context = createContext(
      new Request("http://test/ok", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "placeholder=1",
      }),
      {},
    );
    const adapter = recordingAdapter();
    const outcome = await forms.executeFormAction(
      context,
      {
        schema: okSchema(),
        buildFragment: (output) => {
          builds += 1;
          return `ok:${String(output)}`;
        },
        renderForm: () => null,
        delivery: { redirectTo: "/after", note: "opaque-to-forms" },
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
    );
    expect(outcome.kind).toBe("valid");
    expect(builds).toBe(1);
    expect(commits).toBe(1);
    expect(rollbacks).toBe(0);
    expect(adapter.valids[0]?.fragment).toBe("ok:yes");
    // delivery is opaque pass-through
    expect(adapter.valids[0]?.delivery).toEqual({
      redirectTo: "/after",
      note: "opaque-to-forms",
    });
  });

  test("budget expiry before the action prevents execution (BR-058)", async () => {
    // Pre-aborted scope: the whole pipeline must stop at checkpoint 0.
    const controller = new AbortController();
    controller.abort(new Error("deadline"));

    const context = createContext(
      new Request("http://test/late", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "x=1",
      }),
      {},
      { signal: controller.signal },
    );

    let actionRan = false;
    let adapterCalled = false;
    const outcome = await forms
      .executeFormAction(
        context,
        {
          schema: okSchema(),
          buildFragment: () => {
            actionRan = true;
            return "nope";
          },
          renderForm: () => null,
        },
        {
          invalid: async () => {
            adapterCalled = true;
            return new Response("invalid");
          },
          valid: async () => {
            adapterCalled = true;
            return new Response("valid");
          },
        },
      )
      .catch((error: unknown) => ({ aborted: String(error) }));

    expect(actionRan).toBe(false);
    expect(adapterCalled).toBe(false);
    expect((outcome as { aborted?: string }).aborted).toContain("deadline");
  });

  test("business failure inside fragment building rolls back and rethrows", async () => {
    let commits = 0;
    let rollbacks = 0;
    const context = createContext(
      new Request("http://test/boom", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "x=1",
      }),
      {},
    );
    await expect(
      forms.executeFormAction(
        context,
        {
          schema: okSchema(),
          buildFragment: () => {
            throw new Error("db constraint");
          },
          renderForm: () => null,
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
        failingAdapter(),
      ),
    ).rejects.toThrow("db constraint");
    expect(commits).toBe(0);
    expect(rollbacks).toBe(1);
  });
});

function okSchema(): never {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: () => ({ value: "yes" }),
    },
  } as never;
}
