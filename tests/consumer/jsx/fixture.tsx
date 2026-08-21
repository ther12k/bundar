import type { JSXChild } from "@bundar/jsx";

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
