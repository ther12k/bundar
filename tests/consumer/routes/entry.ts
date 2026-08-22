import { App } from "@bundar/core";

export const app = new App();
app
  .get("/users/:id", (context) => new Response(`user:${context.params.id}`), {
    name: "user-show",
  })
  .post("/users", () => new Response("created", { status: 201 }), {
    name: "user-create",
  })
  .get(
    "/search",
    (context) => {
      const tags = context.query("tag");
      return new Response(`search:${tags}`);
    },
    { name: "search" },
  );
