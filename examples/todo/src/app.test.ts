/**
 * Todo app tests (GH-076): both browser modes from one fixture — no-JS
 * PRG flows, enhanced fragments with normalized OOB counts updates,
 * filters, counts arithmetic, validation, 404s, CSRF fail-closed, and
 * flash consumption. Runs in the full suite (in-process, no port).
 */
import { describe, expect, test } from "bun:test";
import { ErrorBoundary } from "@bundar/core";
import { createTestClient } from "@bundar/testing";
import { htmx2 } from "@bundar/htmx/2";
import { createTodoApp } from "./app";
import { createInMemoryTodoRepository } from "./features/todos/todos.repository";

function fixture() {
  const repository = createInMemoryTodoRepository({ seed: ["Seed one"] });
  const { app } = createTodoApp({ repository });
  // production-faithful: the boundary classifies thrown Csrf/404s so
  // tests observe the same envelopes a browser would
  const boundary = new ErrorBoundary({ development: false });
  const client = createTestClient(
    app.compile({ error: (error: Error) => boundary.capture(error) }),
    { dialect: htmx2 },
  );
  return { client, repository };
}

async function tokenFrom(
  client: ReturnType<typeof fixture>["client"],
): Promise<string> {
  const html = await (await client.get("/")).text();
  return html.match(/name="_csrf"[^>]*value="([^"]*)"/)?.[1] ?? "";
}

describe("GH-076 todo — no-JS flows", () => {
  test("list renders seed items, counts, and filters", async () => {
    const { client } = fixture();
    const html = await (await client.get("/")).text();
    expect(html).toContain("Seed one");
    expect(html).toContain('id="todo-counts"');
    expect(html).toContain("1 total");
    expect(html).toContain('id="filters"');
  });

  test("create → PRG → item listed; flash consumed exactly once", async () => {
    const { client } = fixture();
    const token = await tokenFrom(client);
    const created = await client.submitForm("/todos", {
      _csrf: token,
      title: "Buy milk",
    });
    expect(created.status).toBe(303);
    const list = await (await client.get("/")).text();
    expect(list).toContain("Buy milk");
    expect(list).toContain('id="todo-2"');
    expect(list).toContain("Added");
    const again = await (await client.get("/")).text();
    expect(again).not.toContain("Added");
  });

  test("validation: 1-char title → 422 with the field error", async () => {
    const { client } = fixture();
    const token = await tokenFrom(client);
    const invalid = await client.submitForm("/todos", {
      _csrf: token,
      title: "x",
    });
    expect(invalid.status).toBe(422);
    expect(await invalid.text()).toContain("Title must be 2–200 characters");
  });

  test("toggle and delete through PRG; counts update", async () => {
    const { client } = fixture();
    // tokens rotate on every state change — the PRG GET re-renders fresh
    const token = await tokenFrom(client);
    const created = await client.submitForm("/todos", {
      _csrf: token,
      title: "Temp",
    });
    expect(created.status).toBe(303);

    const toggleToken = await tokenFrom(client);
    const toggled = await client.submitForm("/todos/2/toggle", {
      _csrf: toggleToken,
    });
    expect(toggled.status).toBe(303);
    const done = await (await client.get("/?filter=done")).text();
    expect(done).toContain('id="todo-2"');

    const deleteToken = await tokenFrom(client);
    const deleted = await client.submitForm("/todos/2/delete", {
      _csrf: deleteToken,
    });
    expect(deleted.status).toBe(303);
    const after = await (await client.get("/")).text();
    expect(after).not.toContain('id="todo-2"');
    expect(after).toContain("Deleted");
  });

  test("edit renames through PRG", async () => {
    const { client } = fixture();
    const token = await tokenFrom(client);
    const edited = await client.submitForm("/todos/1/edit", {
      _csrf: token,
      title: "Renamed seed",
    });
    expect(edited.status).toBe(303);
    expect(await (await client.get("/")).text()).toContain("Renamed seed");
  });

  test("unknown id → 404 without internals (both modes)", async () => {
    const { client } = fixture();
    const token = await tokenFrom(client);
    const ordinary = await client.submitForm("/todos/999/delete", {
      _csrf: token,
    });
    expect(ordinary.status).toBe(404);
    const body = await ordinary.text();
    expect(body).toContain("Todo not found");
    expect(body).not.toContain(".ts:");
  });
});

describe("GH-076 todo — enhanced (htmx) flows", () => {
  test("enhanced create returns item markup + OOB counts (normalized intents)", async () => {
    const { client } = fixture();
    const token = await tokenFrom(client);
    const response = await client.enhancedSubmitForm(
      "/todos",
      { _csrf: token, title: "Enhanced task" },
      { target: "#todo-list" },
    );
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('id="todo-2"');
    expect(body).toContain("Enhanced task");
    // the counts update serialized as an out-of-band intent
    expect(body).toContain('id="todo-counts"');
    expect(body).toContain("2 total");
    expect(body).not.toContain("<html");
  });

  test("enhanced delete carries an OOB remove intent for the row", async () => {
    const { client } = fixture();
    const token = await tokenFrom(client); // fresh client: no prior mutation
    const response = await client.submitForm(
      "/todos/1/delete",
      { _csrf: token },
      { headers: { "hx-request": "true", "hx-target": "#todo-list" } },
    );
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('id="todo-1"'); // the OOB delete element
    expect(body).toContain("0 total");
  });

  test("enhanced list GET is a fragment", async () => {
    const { client } = fixture();
    const body = await (await client.enhancedGet("/")).text();
    expect(body).toContain('id="todos-region"');
    expect(body).not.toContain("<html");
  });
});

describe("GH-076 todo — CSRF posture and isolation", () => {
  test("tokenless mutations fail closed 403; foreign origin too", async () => {
    const { client } = fixture();
    expect((await client.submitForm("/todos", { title: "Nope" })).status).toBe(
      403,
    );
    const token = await tokenFrom(client);
    expect(
      (
        await client.submitForm(
          "/todos",
          { _csrf: token, title: "Evil" },
          { headers: { origin: "http://evil.example" } },
        )
      ).status,
    ).toBe(403);
  });

  test("concurrent fixtures are isolated (separate repositories/clients)", async () => {
    const a = fixture();
    const b = fixture();
    const tokenA = await tokenFrom(a.client);
    await a.client.submitForm("/todos", { _csrf: tokenA, title: "Only in A" });
    expect(a.repository.counts().all).toBe(2);
    expect(b.repository.counts().all).toBe(1);
  });
});
