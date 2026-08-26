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
  // BR-087: HtmxScript's error-swap preset meta must be in <head>.
  return document({
    lang: "en",
    title,
    head: HtmxScript({ dialect, src: urls["asset-htmx"](), integrity: null }),
    children: [
      <header>
        <nav>
          <a href={urls.home()}>Bundar starter</a>
        </nav>
      </header>,
      // the error region: validation failures land here for enhanced flows
      <main id="content">{children}</main>,
    ],
  });
}
