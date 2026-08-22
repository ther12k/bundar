import { streamResponse, type JSXChild } from "@bundar/jsx";

/** GH-036: typed hx-* attributes compile in an external consumer. */
export function HtmxList(): JSXChild {
  return (
    <div>
      <button
        hx-get="/items"
        hx-target="#list"
        hx-swap="outerHTML swap:50ms"
        hx-trigger="click delay:100ms"
      >
        Load
      </button>
      <ul id="list" hx-boost={true} />
    </div>
  );
}

/** GH-036: streaming responses compile and carry `finished`. */
export function streamed(
  tree: JSXChild,
): Response & { finished: Promise<void> } {
  return streamResponse(tree, {
    status: 200,
    headers: { "x-app": "consumer" },
  });
}

export function Page(props: { title: string }): JSXChild {
  return (
    <main className="page">
      <h1>{props.title}</h1>
      <form method="post" action="/save">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required />
        <button type="submit">Save</button>
      </form>
    </main>
  );
}

export function FragmentPage(): JSXChild {
  return (
    <>
      <p>first</p>
      <p>second</p>
    </>
  );
}

// server JSX does not support browser event handlers — this must stay a type error
const unsupported = (
  // @ts-expect-error onClick is typed as the guidance string, not a function
  <button onClick={() => undefined}>No client handler</button>
);
void unsupported;
