// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["**/dist/**", "coverage/**", "node_modules/**"] },
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
