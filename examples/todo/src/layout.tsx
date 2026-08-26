/** Shared document shell for the Todo app (GH-076, BR-035): real TSX. */
import { document } from "@bundar/jsx";
import { HtmxScript } from "@bundar/htmx";
import { dialect } from "./platform/dialect";

export function Layout({
  title,
  flash,
  children,
}: {
  title: string;
  flash: readonly { message: string }[];
  children: import("@bundar/jsx").JSXChild;
}) {
  // BR-087: HtmxScript renders the dialect's error-swap preset as a
  // <meta name="htmx-config"> BEFORE the script — it must live in <head>,
  // where htmx reads it at load.
  return document({
    lang: "en",
    title,
    head: HtmxScript({ dialect, src: "/assets/htmx.js", integrity: null }),
    children: [
      <header>
        <h1>Bundar Todos</h1>
      </header>,
      // flash region: aria-live so screen readers announce results
      <p id="flash" aria-live="polite">
        {flash.map((f) => f.message).join(" ")}
      </p>,
      <main>{children}</main>,
    ],
  });
}
