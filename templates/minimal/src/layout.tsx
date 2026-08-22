/** One document layout: nav, content region, local htmx asset (no CDN). */
import { document, jsx } from "@bundar/jsx";
import { HtmxScript } from "@bundar/htmx";
import { dialect } from "./dialect";

export function Layout({
  title,
  children,
}: {
  title: string;
  children: unknown;
}) {
  return document({
    lang: "en",
    title,
    children: [
      jsx("header", {
        children: jsx("nav", {
          children: jsx("a", { href: "/", children: "Bundar starter" }),
        }),
      }),
      // the error region: validation failures land here for enhanced flows
      jsx("main", { id: "content", children }),
      HtmxScript({ dialect, src: "/assets/htmx.js", integrity: null }),
    ],
  });
}
