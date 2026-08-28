import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import manifest from "./docs-manifest.json";

const sidebar = [
  {
    label: "Introduction",
    items: [{ label: "Introduction", slug: "" }],
  },
  ...manifest.groups.map((group) => ({
    label: group.label,
    items: group.items.map((item) => ({ label: item.title, slug: item.slug })),
  })),
];

export default defineConfig({
  site: "https://bundar.dev",
  // The site lives under /docs (bundar.dev/docs); the root landing page is
  // added when the project gets its own domain apex.
  base: "/docs",
  integrations: [
    starlight({
      title: "Bundar",
      description:
        "HTML-first, server-only-JSX web framework for Bun. Ordinary forms by default, htmx enhancement when you want it.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/ther12k/bundar",
        },
      ],
      sidebar,
      customCss: ["./src/styles/custom.css"],
    }),
  ],
});
