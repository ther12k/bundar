/**
 * Shared template building blocks for both structures (BR-024/BR-025).
 */
import type { ScaffoldDialect } from "../src/index";

export interface TemplateContext {
  readonly name: string;
  readonly dialect: ScaffoldDialect;
}

export type TemplateFile = (context: TemplateContext) => string;

export const DIALECT_IMPORT: Readonly<Record<ScaffoldDialect, string>> = {
  htmx2: `import { htmx2 } from "@bundar/htmx/2";`,
  "htmx4-experimental": `import { htmx4Experimental } from "@bundar/htmx/4";`,
};

export const DIALECT_BINDING: Readonly<Record<ScaffoldDialect, string>> = {
  htmx2: `export const dialect = htmx2;`,
  "htmx4-experimental": `export const dialect = htmx4Experimental;`,
};

export const EXPERIMENTAL_BANNER = (context: TemplateContext): string =>
  context.dialect === "htmx4-experimental"
    ? `\n * ⚠ EXPERIMENTAL DIALECT: htmx 4.0.0-beta6 — beta software, no GA\n * compatibility claim. Data per docs/compatibility/htmx4-beta6.md.\n`
    : ``;

export function dialectModule(context: TemplateContext): string {
  return `/**${EXPERIMENTAL_BANNER(context)}
 * The ONE dialect decision in the application: bootstrap-time only.
 * Route handlers and components stay dialect-agnostic.
 */
${DIALECT_IMPORT[context.dialect]}

${DIALECT_BINDING[context.dialect]}
`;
}
