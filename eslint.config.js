// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "coverage/**",
      "node_modules/**",
      "website/.astro/**",
      "website/src/content/docs/**",
      "fixtures/htmx2/htmx.min.js",
      "fixtures/htmx4/htmx.min.js",
      "**/*.min.js",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      // engineering/coding-standards.md: no unexplained `any`.
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);
