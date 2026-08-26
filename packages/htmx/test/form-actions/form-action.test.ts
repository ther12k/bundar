/**
 * GH-060 progressive validated form action tests: identical validation for
 * both worlds, invalid-form rendering with retained values and focus
 * hints, exactly-once success execution inside transaction hooks with
 * rollback on business failure, and approved action semantics.
 */
import { describe, expect, test } from "bun:test";
import { createContext } from "@bundar/core";
import { jsx } from "@bundar/jsx";
import { runFormAction } from "../../src/index";
import type { FormWorkflowContext } from "@bundar/forms";
import type { StandardSchema } from "@bundar/schema";
import type { FormActionDefinition, InvalidFormRender } from "../../src/index";

const schema: StandardSchema<unknown, { name: string; email: string }> = {
  "~standard": {
    version: 1,
    vendor: "test",
    validate: (value) => {
      const record = value as Record<string, unknown>;
      const issues: Array<{ message: string; path: PropertyKey[] }> = [];
      if (typeof record.name !== "string" || record.name.length < 2) {
        issues.push({ message: "Name too short", path: ["name"] });
      }
      if (typeof record.email !== "string" || !record.email.includes("@")) {
        issues.push({ message: "Email invalid", path: ["email"] });
      }
      return issues.length > 0 ? { issues } : { value: record as never };
    },
  },
};

function formContext(
  body: string,
  headers: Record<string, string> = {},
): FormWorkflowContext {
  return createContext(
    new Request("http://localhost/register", {
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

let successRuns = 0;
const definition = (): FormActionDefinition<{
  name: string;
  email: string;
}> => ({
  schema,
  action: {
    fragment: (output) =>
      jsx("p", { id: "welcome", children: `hi ${output.name}` }),
    redirectTo: "/welcome",
  },
  renderForm: (render: InvalidFormRender) =>
    jsx("form", {
      id: "register",
      children: [
        ...(render.firstErrorField
          ? [jsx("input", { name: render.firstErrorField, autofocus: true })]
          : []),
        jsx("input", {
          name: "name",
          value: (render.submitted.name as string | undefined) ?? "",
        }),
      ],
    }),
  formTarget: "#register-card",
});

describe("GH-060 invalid submissions", () => {
  test("no-JS invalid: 422 full document with errors and retained values", async () => {
    const outcome = await runFormAction(
      formContext("name=B&email=not-an-email"),
      definition(),
    );
    expect(outcome.kind).toBe("invalid");
    const body = await outcome.response.text();
    expect(outcome.response.status).toBe(422);
    expect(body).toContain("Name too short");
    expect(body).toContain("Email invalid");
  });

  test("enhanced invalid: 422 fragment limited to the form region", async () => {
    const outcome = await runFormAction(
      formContext("name=B&email=bad", { "HX-Request": "true" }),
      definition(),
    );
    expect(outcome.kind).toBe("invalid");
    const body = await outcome.response.text();
    expect(outcome.response.status).toBe(422);
    expect(body).not.toContain("<html");
    expect(body).toContain('id="register"');
    expect(outcome.response.headers.get("hx-retarget")).toBe("#register-card");
  });

  test("safe values are retained and secrets redacted", async () => {
    const outcome = await runFormAction(
      formContext("name=Bundar&email=bad&password=hunter2", {
        "HX-Request": "true",
      }),
      {
        ...definition(),
        renderForm: (render) =>
          jsx("div", {
            children: JSON.stringify({
              name: render.submitted.name,
              password: render.submitted.password,
            }),
          }),
      },
    );
    const body = await outcome.response.text();
    expect(body).toContain("Bundar");
    expect(body).not.toContain("hunter2");
  });

  test("both worlds run identical validation (same failures)", async () => {
    const invalid = "name=&email=";
    const noJs = await runFormAction(formContext(invalid), definition());
    const enhanced = await runFormAction(
      formContext(invalid, { "HX-Request": "true" }),
      definition(),
    );
    expect(noJs.kind).toBe("invalid");
    expect(enhanced.kind).toBe("invalid");
    expect(noJs.response.status).toBe(enhanced.response.status);
  });
});

describe("GH-060 valid submissions", () => {
  test("the success fragment runs exactly once and both worlds get approved semantics", async () => {
    successRuns = 0;
    const def = {
      ...definition(),
      action: {
        fragment: (output: { name: string }) => {
          successRuns += 1;
          return jsx("p", { id: "welcome", children: `hi ${output.name}` });
        },
        redirectTo: "/welcome",
      },
    };
    const enhanced = await runFormAction(
      formContext("name=Bundar&email=team%40bundar.invalid", {
        "HX-Request": "true",
      }),
      def,
    );
    expect(enhanced.kind).toBe("valid");
    expect(await enhanced.response.text()).toBe(
      '<p id="welcome">hi Bundar</p>',
    );
    const ordinary = await runFormAction(
      formContext("name=Bundar&email=team%40bundar.invalid"),
      def,
    );
    expect(ordinary.kind).toBe("valid");
    expect(ordinary.response.status).toBe(303);
    expect(ordinary.response.headers.get("location")).toBe("/welcome");
    expect(successRuns).toBe(2); // once per request, never more
  });

  test("transaction hooks bracket the valid path; rollback on business failure", async () => {
    const calls: string[] = [];
    let runs = 0;
    const def: FormActionDefinition<{ name: string; email: string }> = {
      schema,
      action: {
        fragment: () => {
          runs += 1;
          if (runs === 1) throw new Error("business exploded");
          return jsx("p", { children: "saved" });
        },
        redirectTo: "/saved",
      },
      renderForm: () => jsx("p", { children: "form" }),
      transaction: {
        begin: () => {
          calls.push("begin");
          return { token: 1 };
        },
        commit: () => {
          calls.push("commit");
        },
        rollback: () => {
          calls.push("rollback");
        },
      },
    };
    await expect(
      runFormAction(
        formContext("name=Bundar&email=team%40bundar.invalid"),
        def,
      ),
    ).rejects.toThrow("business exploded");
    expect(calls).toEqual(["begin", "rollback"]);

    calls.length = 0;
    const second = await runFormAction(
      formContext("name=Bundar&email=team%40bundar.invalid"),
      def,
    );
    expect(second.kind).toBe("valid");
    expect(calls).toEqual(["begin", "commit"]);
  });

  test("field errors never require JSON client code (HTML only)", async () => {
    const outcome = await runFormAction(
      formContext("name=&email=", { "HX-Request": "true" }),
      definition(),
    );
    expect(outcome.response.headers.get("content-type")).toBe(
      "text/html; charset=utf-8",
    );
    const body = await outcome.response.text();
    // the re-rendered form region carries the focus hint; error text lives
    // in the region too — both pure HTML, no JSON payload anywhere
    expect(body).toContain('id="register"');
    expect(body).toContain("autofocus");
    expect(body).not.toContain("application/json");
  });
});

// BR-088 (#140): ordinary invalid submissions re-render the APPLICATION
// document when renderInvalidDocument is provided; the default document
// carries NO dangling field anchors.
describe("BR-088 renderInvalidDocument", () => {
  const invalidSchema = {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: (input: unknown) => {
        const title = String(
          (input as Record<string, unknown> | null)?.title ?? "",
        );
        return title.length >= 2
          ? { value: { title } }
          : {
              issues: [
                { path: ["title"], message: "Title must be 2+ characters" },
              ],
            };
      },
    },
  } as never;

  function contextWith(body: string): ReturnType<typeof createContext> {
    return createContext(
      new Request("http://t/todos", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      }),
      {},
    );
  }

  test("ordinary 422 uses the application document with retained values", async () => {
    const outcome = await runFormAction(
      contextWith("title=x") as never,
      {
        schema: invalidSchema,
        action: { fragment: () => "ok", redirectTo: "/" },
        renderForm: (render: InvalidFormRender) =>
          jsx("form", {
            children: render.errors.first[0]?.message ?? "",
          }),
        renderInvalidDocument: (render: InvalidFormRender) =>
          jsx("html", {
            lang: "en",
            children: jsx("body", {
              children: [
                jsx("input", {
                  name: "title",
                  value: render.submitted["title"] ?? "",
                }),
              ],
            }),
          }),
      } as never,
    );
    const res = (outcome as { response: Response }).response;
    expect(res.status).toBe(422);
    const body = await res.text();
    expect(body).toContain("<html");
    expect(body).toContain('value="x"'); // retained safe value round-trips
  });

  test("the default generic document renders NO field anchor links", async () => {
    const outcome = await runFormAction(
      contextWith("title=x") as never,
      {
        schema: invalidSchema,
        action: { fragment: () => "ok", redirectTo: "/" },
        renderForm: () => jsx("form", {}),
      } as never,
    );
    const res = (outcome as { response: Response }).response;
    expect(res.status).toBe(422);
    const body = await res.text();
    expect(body).toContain("error-summary");
    expect(body).toContain("Title must be 2+ characters");
    expect(body).not.toContain('href="#title"'); // no dangling anchors
  });
});
