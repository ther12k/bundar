/** One document layout: nav, content region, local htmx asset (no CDN). */
import { document, type JSXChild } from "@bundar/jsx";
import { HtmxScript } from "@bundar/htmx";
import { urls } from "./routes.gen";
import { dialect } from "./platform/dialect";

export function Layout({
  title,
  children,
}: {
  title: string;
  children: JSXChild;
}) {
  return document({
    lang: "en",
    title,
    children: [
      <header>
        <nav>
          <a href={urls.home()}>Bundar starter</a>
        </nav>
      </header>,
      // the error region: validation failures land here for enhanced flows
      <main id="content">{children}</main>,
      HtmxScript({ dialect, src: urls["asset-htmx"](), integrity: null }),
    ],
  });
}
