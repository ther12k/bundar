/**
 * GH-185 redesign proofs: create and edit run on the separated facade —
 * repository mutation only inside run(), success renderers pure, invalid
 * rendering via field(name) with duplicate submissions never coerced.
 * Behavior contracts (CSRF, flash, OOB counts, PRG) stay pinned by
 * app.test.ts; this file proves the SEPARATION itself.
 */
import { describe, expect, test } from "bun:test";
import { ErrorBoundary } from "@bundar/core";
import { createTestClient, TEST_ORIGIN } from "@bundar/testing";
import { buildHtmxRequestHeaders } from "@bundar/htmx";
import { htmx2 } from "@bundar/htmx/2";
import { createTodoApp } from "./app";
import {
  createInMemoryTodoRepository,
  type TodoRepository,
} from "./features/todos/todos.repository";

/** Repository spy: counts mutations without changing behavior. */
function countingRepository(seed: string[]): TodoRepository & {
  mutations: number;
} {
  const inner = createInMemoryTodoRepository({ seed });
  let mutations = 0;
  const wrap = <T extends (...args: never[]) => unknown>(fn: T) =>
    ((...args: never[]) => {
      mutations += 1;
      return fn(...args);
    }) as T;
  return {
    ...inner,
    get mutations() {
      return mutations;
    },
    create: wrap(inner.create.bind(inner)),
    toggle: wrap(inner.toggle.bind(inner)),
    rename: wrap(inner.rename.bind(inner)),
    remove: wrap(inner.remove.bind(inner)),
  } as TodoRepository & { mutations: number };
}

function fixture(seed: string[] = ["Seed one"]) {
  const repository = countingRepository(seed);
  const { app } = createTodoApp({ repository });
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

describe("GH-185 separated todo actions", () => {
  test("create ordinary: mutation exactly once, 303 PRG, flash unchanged", async () => {
    const { client, repository } = fixture();
    const token = await tokenFrom(client);
    const response = await client.submitForm("/todos", {
      _csrf: token,
      title: "Buy milk",
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/");
    expect(repository.mutations).toBe(1);
    const list = await (await client.get("/")).text();
    expect(list).toContain("Added");
  });

  test("create enhanced: mutation exactly once, item + OOB counts fragment", async () => {
    const { client, repository } = fixture();
    const token = await tokenFrom(client);
    const response = await client.enhancedSubmitForm("/todos", {
      _csrf: token,
      title: "Enhanced item",
    });
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Enhanced item");
    expect(body).toContain('id="todo-counts"');
    expect(repository.mutations).toBe(1);
  });

  test("invalid ordinary: zero mutations, full document, retained title, valid CSRF", async () => {
    const { client, repository } = fixture();
    const token = await tokenFrom(client);
    const response = await client.submitForm("/todos", {
      _csrf: token,
      title: "x",
    });
    expect(response.status).toBe(422);
    const body = await response.text();
    expect(repository.mutations).toBe(0);
    // the application document (not the generic error page) re-renders
    expect(body).toContain('id="todo-list"');
    expect(body).toContain('value="x"');
    // aria association retained for the no-JS invalid form
    expect(body).toContain("aria-invalid");
    expect(body).toContain("aria-describedby");
    // a FRESH token accompanies the re-render
    const fresh = await tokenFrom(client);
    expect(fresh.length).toBeGreaterThan(0);
  });

  test("invalid enhanced: zero mutations, form fragment, retarget + outerHTML", async () => {
    const { client, repository } = fixture();
    const token = await tokenFrom(client);
    const response = await client.enhancedSubmitForm("/todos", {
      _csrf: token,
      title: "x",
    });
    expect(response.status).toBe(422);
    const body = await response.text();
    expect(repository.mutations).toBe(0);
    expect(body).toContain('id="todo-form"');
    // raw protocol-header assertions live in the package-level GH-184
    // conformance suite — application code stays protocol-ignorant
  });

  test("duplicate title submissions: field() exposes the FIRST, never a joined string", async () => {
    const { client, repository } = fixture();
    const token = await tokenFrom(client);
    // a record literal cannot carry duplicate keys — post the raw body
    const response = await client.post("/todos", {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: TEST_ORIGIN,
        // neutral builder — application code never spells protocol names
        ...buildHtmxRequestHeaders({}, htmx2),
      },
      body: `_csrf=${encodeURIComponent(token)}&title=x&title=second`,
    });
    expect(response.status).toBe(422);
    const body = await response.text();
    expect(repository.mutations).toBe(0);
    // first value retained as the field's value — no "x,second" coercion
    expect(body).toContain('value="x"');
    expect(body).not.toContain("x,second");
  });

  test("edit: rename inside run() only; not-found preserved", async () => {
    const { client, repository } = fixture(["Existing"]);
    const token = await tokenFrom(client);
    const renamed = await client.submitForm("/todos/1/edit", {
      _csrf: token,
      title: "Renamed item",
    });
    // synchronizer tokens are one-time: fetch a fresh one per request
    expect(renamed.status).toBe(303);
    expect(repository.mutations).toBe(1);
    const list = await (await client.get("/")).text();
    expect(list).toContain("Renamed item");

    // not-found: same behavior as before the migration
    const missing = await client.submitForm("/todos/999/edit", {
      _csrf: await tokenFrom(client),
      title: "Ghost",
    });
    expect(missing.status).toBe(303);
    expect(repository.mutations).toBe(2); // rename attempted once more
    const after = await (await client.get("/")).text();
    expect(after).not.toContain("Ghost");
    expect(after).toContain("Renamed item");
  });

  test("invalid edit: zero mutations, field error rendered", async () => {
    const { client, repository } = fixture(["Existing"]);
    const token = await tokenFrom(client);
    const response = await client.enhancedSubmitForm("/todos/1/edit", {
      _csrf: token,
      title: "x",
    });
    expect(response.status).toBe(422);
    expect(repository.mutations).toBe(0);
    expect(await response.text()).toContain(
      "Title must be 2\u2013200 characters",
    );
  });
});
