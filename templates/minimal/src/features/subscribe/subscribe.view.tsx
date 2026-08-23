/**
 * Views for the subscribe feature (BR-028): real TSX components rendering
 * typed data. Views never call actions or touch protocol code.
 */
import type { InvalidFormRender } from "@bundar/forms";
import { urls } from "../../routes.gen";

const EMPTY_RENDER: InvalidFormRender = {
  errors: {
    fields: {},
    global: [],
    order: [],
    submitted: {},
    field: () => [],
    has: () => false,
    first: [],
    empty: true,
  },
  submitted: {},
  firstErrorField: null,
};

export function homeContent() {
  return (
    <>
      <h1>Bundar starter</h1>
      <p>Server JSX + htmx, one set of handlers for every browser mode.</p>
      {SubscribeForm({})}
    </>
  );
}

/** The progressive form: works without JS (PRG) and with htmx (fragments). */
export function SubscribeForm({
  render = EMPTY_RENDER,
}: {
  render?: InvalidFormRender;
}) {
  return (
    <form
      id="subscribe-form"
      method="post"
      action={urls.subscribe()}
      hx-post={urls.subscribe()}
      hx-target="#subscribe-form"
    >
      <input
        type="email"
        name="email"
        placeholder="you@example.com"
        value={(render.submitted["email"] as string | undefined) ?? ""}
      />
      {/* the error region inside the form: field messages land here */}
      <p id="email-error" role="alert">
        {render.errors.first[0]?.message ?? ""}
      </p>
      <button type="submit">Subscribe</button>
    </form>
  );
}

export function SubscribedFragment({ email }: { email: string }) {
  return <p id="subscribed">Subscribed: {email}</p>;
}
