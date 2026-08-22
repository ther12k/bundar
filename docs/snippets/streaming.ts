/** Runnable snippet: streamed rendering with backpressure (GH-034). */
import { renderToStream } from "@bundar/jsx";
import { jsx } from "@bundar/jsx";

const tree = jsx("ul", {
  children: [1, 2, 3].map((n) => jsx("li", { children: `item ${n}` })),
});
const { stream, finished } = renderToStream(tree);
const chunks: string[] = [];
const reader = stream.getReader();
for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks.push(new TextDecoder().decode(value));
}
const html = chunks.join("");
if (!html.includes("<li>item 1</li>") || !html.includes("<li>item 3</li>")) {
  throw new Error("snippet streaming: incomplete output");
}
await finished;
