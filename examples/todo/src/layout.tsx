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
  return document({
    lang: "en",
    title,
    children: [
      <header>
        <h1>Bundar Todos</h1>
      </header>,
      // flash region: aria-live so screen readers announce results
      <p id="flash" aria-live="polite">
        {flash.map((f) => f.message).join(" ")}
      </p>,
      <main>{children}</main>,
      HtmxScript({ dialect, src: "/assets/htmx.js", integrity: null }),
    ],
  });
}
