/**
 * Views for the subscribe feature (BR-028): real TSX components rendering
 * typed data. Views never call actions or touch protocol code.
 */
import type { InvalidFieldView } from "@bundar/forms";
import { urls } from "../../routes.gen";

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
export function SubscribeForm({ field }: { field?: InvalidFieldView }) {
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
        value={field?.value ?? ""}
      />
      {/* the error region inside the form: field messages land here */}
      <p id="email-error" role="alert">
        {field?.error ?? ""}
      </p>
      <button type="submit">Subscribe</button>
    </form>
  );
}

export function SubscribedFragment({ email }: { email: string }) {
  return <p id="subscribed">Subscribed: {email}</p>;
}
