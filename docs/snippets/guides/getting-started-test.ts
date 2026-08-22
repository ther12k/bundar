/** Guide snippet: getting-started §3 (test both modes) — CI-run. */
import { createTestClient } from "@bundar/testing";
import { app } from "./getting-started-routing";
import { register } from "./getting-started-view";

register(app);
const client = createTestClient(app);
const document_ = await client.get("/items"); // full document
const fragment = await client.enhancedGet("/items"); // htmx fragment
// --- guide code above; runnable wiring below
if ((await document_.text()).includes("<html") !== true) {
  throw new Error("guide snippet: expected a document");
}
if ((await fragment.text()).includes("<html")) {
  throw new Error("guide snippet: expected a fragment");
}
export { client };
