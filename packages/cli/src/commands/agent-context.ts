/**
 * `bundar agent-context` (BR-048): bounded, deterministic context packs for
 * coding agents. A pack contains ONLY what one task kind needs: UI packs
 * exclude persistence implementations; action packs exclude JSX/HTMX.
 * Fail-closed budgets; secrets, env files, build artifacts, and dependency
 * directories are structurally unreachable.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import type { CommandContext, CommandDefinition } from "../cli";
import { setData, suggestNext, warn } from "../cli";

const SCHEMA = "bundar.agent-context/1";
const DEFAULT_MAX_BYTES = 16_384;

export type ContextKind = "ui" | "actions";

export interface AgentContextPackV1 {
  readonly schema: typeof SCHEMA;
  readonly app: string;
  readonly feature: string;
  readonly kind: ContextKind;
  readonly entrypoint: string | null;
  readonly summary: string;
  readonly invariants: readonly string[];
  readonly publicApis: readonly string[];
  readonly directDependencies: readonly string[];
  readonly directDependents: readonly string[];
  readonly readOnlyEvidence: readonly string[];
  readonly writablePaths: readonly string[];
  readonly commands: readonly string[];
  readonly unresolvedTodos: readonly {
    readonly path: string;
    readonly line: number;
    readonly text: string;
  }[];
}

function* walk(dir: string): Generator<string> {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".git" ||
        entry.name === "dist"
      )
        continue;
      yield* walk(path);
    } else if (/\.(ts|tsx|md)$/.test(entry.name)) yield path;
  }
}

function agentMapField(featureDir: string, field: string): string {
  const mapPath = join(featureDir, "AGENTS.md");
  if (!existsSync(mapPath)) return "";
  const line = readFileSync(mapPath, "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${field}:`));
  return line === undefined ? "" : line.slice(field.length + 1).trim();
}

function extractTodos(
  absolutePath: string,
  appDir: string,
): { path: string; line: number; text: string }[] {
  const rel = relative(appDir, absolutePath).split("\\").join("/");
  return readFileSync(absolutePath, "utf8")
    .split("\n")
    .flatMap((text, index) =>
      /\b(TODO|FIXME)\b/.test(text)
        ? [{ path: rel, line: index + 1, text: text.trim().slice(0, 120) }]
        : [],
    );
}

/** Writable ownership per task kind; everything else is evidence-only. */
const WRITABLE_BY_KIND: Readonly<Record<ContextKind, RegExp>> = {
  ui: /\.(view|components|ui)\.tsx$/,
  actions: /(\.actions\.tsx?|\.schema\.tsx?|\.types\.tsx?|\.repository\.tsx?)$/,
};

function runPack(
  ctx: CommandContext,
  appRel: string,
  featureName: string,
  kind: ContextKind,
): number {
  const repoRoot = process.cwd();
  const appDir = join(repoRoot, appRel);
  const featureDir = join(appDir, "src/features", featureName);
  if (!existsSync(featureDir)) {
    warn(`unknown feature directory: src/features/${featureName} in ${appRel}`);
    return 1;
  }

  const allFiles = [...walk(featureDir)]
    .map((absolute) => relative(appDir, absolute).split("\\").join("/"))
    .sort();

  const entrypoint =
    allFiles.find((f) => /\.routes\.(ts|tsx)$/.test(f)) ??
    allFiles.find((f) => /\.view\.tsx$/.test(f)) ??
    null;

  // Writable set by kind; everything else stays as read-only evidence.
  const writable = allFiles.filter((f) => WRITABLE_BY_KIND[kind].test(f));
  const readOnly = allFiles.filter((f) => !writable.includes(f));

  // Structural fail-closed guard: a UI pack must never own persistence,
  // an actions pack must never own rendered output.
  const forbiddenForKind =
    kind === "ui" ? /\.repository\.tsx?$/ : /\.(view|components)\.tsx$/;
  if (writable.some((f) => forbiddenForKind.test(f))) {
    warn(`kind "${kind}" produced forbidden writable paths`);
    return 1;
  }

  // Public API surface of writables + entrypoint.
  // API + dependency scan scope. Action packs deliberately EXCLUDE the
  // delivery entrypoint: its imports are exactly the JSX/HTMX coupling
  // this kind must not carry into an agent's context.
  const scanScope =
    kind === "actions"
      ? writable
      : [...writable, ...(entrypoint !== null ? [entrypoint] : [])];

  const publicApis = new Set<string>();
  for (const f of new Set(scanScope)) {
    const source = readFileSync(join(appDir, f), "utf8");
    for (const m of source.matchAll(
      /export\s+(?:async\s+)?(?:function|const|class|interface|type)\s+(\w+)/g,
    ))
      publicApis.add(`${f}:${m[1]}`);
  }

  // Direct dependencies of the scoped sources.
  const dependencies = new Set<string>();
  for (const f of new Set(scanScope)) {
    const source = readFileSync(join(appDir, f), "utf8");
    for (const m of source.matchAll(/from\s+["']([^"']+)["']/g)) {
      const spec = m[1]!;
      dependencies.add(
        spec.startsWith(".") ? join(f, "..", spec).split("\\").join("/") : spec,
      );
    }
  }

  // Direct dependents: app sources OUTSIDE the slice importing into it.
  const dependents = new Set<string>();
  const scanDependents = (dir: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "dist") continue;
        scanDependents(path);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        const rel = relative(appDir, path).split("\\").join("/");
        if (rel.startsWith(`src/features/${featureName}/`)) continue;
        const source = readFileSync(path, "utf8");
        if (
          source.includes(`/features/${featureName}/`) ||
          source.includes(`./${featureName}.`)
        )
          dependents.add(rel);
      }
    }
  };
  scanDependents(join(appDir, "src"));

  const commands = ["bun run typecheck", "bun test"];
  if (
    existsSync(join(appDir, "package.json")) &&
    readFileSync(join(appDir, "package.json"), "utf8").includes("app:arch")
  )
    commands.push("bun run app:arch .");

  const todos = [
    ...writable,
    ...(entrypoint !== null ? [entrypoint] : []),
  ].flatMap((f) => extractTodos(join(appDir, f), appDir));

  let diff = "";
  if (ctx.flags["include-diff"] === true) {
    const proc = Bun.spawnSync(
      ["git", "diff", "--", `src/features/${featureName}`],
      {
        cwd: appDir,
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    diff = proc.stdout.toString().slice(0, 4000);
  }

  const pack: AgentContextPackV1 = {
    schema: SCHEMA,
    app: appRel,
    feature: featureName,
    kind,
    entrypoint,
    summary:
      agentMapField(featureDir, "Purpose") ||
      `${featureName} (${kind} context)`,
    invariants: [
      agentMapField(featureDir, "Escalate when") ||
        "escalation conditions not declared in AGENTS.md",
    ],
    publicApis: [...publicApis].sort(),
    directDependencies: [...dependencies].sort(),
    directDependents: [...dependents].sort(),
    readOnlyEvidence: readOnly,
    writablePaths: writable,
    commands,
    unresolvedTodos: todos,
  };

  const serialized =
    ctx.flags["format"] === "md"
      ? renderMarkdown(pack, diff)
      : JSON.stringify(diff.length > 0 ? { ...pack, diff } : pack, null, 2);

  const bytes = Buffer.byteLength(serialized, "utf8");
  const maxBytesRaw = ctx.flags["max-bytes"];
  const overrideGiven =
    typeof maxBytesRaw === "string" && /^\d+$/.test(maxBytesRaw);
  const maxBytes = overrideGiven ? Number(maxBytesRaw) : DEFAULT_MAX_BYTES;

  // Fail closed on budget unless explicitly overridden via --max-bytes.
  if (bytes > maxBytes) {
    warn(
      `pack is ${bytes} bytes, over budget ${maxBytes}` +
        (overrideGiven ? "" : " — pass --max-bytes <n> to override"),
    );
    return 1;
  }

  setData({
    schema: pack.schema,
    bytes,
    format: ctx.flags["format"] === "md" ? "md" : "json",
    truncatedByBudget: bytes > DEFAULT_MAX_BYTES && overrideGiven,
  });
  suggestNext(
    `bundar inspect --scope feature --app ${appRel} --feature ${featureName}`,
  );

  if (!ctx.json) process.stdout.write(`${serialized}\n`);
  // In --json mode the ENVELOPE carries the pack under data (BR-046).
  else setData({ ...pack, ...(diff.length > 0 ? { diff } : {}) });
  return 0;
}

function renderMarkdown(pack: AgentContextPackV1, diff: string): string {
  const lines = [
    `# ${pack.feature} — ${pack.kind} context`,
    "",
    `Summary: ${pack.summary}`,
    `Entrypoint: ${pack.entrypoint ?? "?"}`,
    "",
    "## Public APIs",
    ...pack.publicApis.map((api) => `- ${api}`),
    "",
    "## Direct dependencies",
    ...pack.directDependencies.map((d) => `- ${d}`),
    "",
    "## Direct dependents",
    ...pack.directDependents.map((d) => `- ${d}`),
    "",
    "## Read-only evidence",
    ...pack.readOnlyEvidence.map((f) => `- ${f}`),
    "",
    "## Writable paths",
    ...pack.writablePaths.map((f) => `- ${f}`),
    "",
    "## Commands",
    ...pack.commands.map((c) => `- ${c}`),
    "",
    "## Unresolved TODOs",
    ...(pack.unresolvedTodos.length > 0
      ? pack.unresolvedTodos.map((t) => `- ${t.path}:${t.line} ${t.text}`)
      : ["- none"]),
    "",
    "## Invariants",
    ...pack.invariants.map((i) => `- ${i}`),
  ];
  if (diff.length > 0)
    lines.push("", "## Current diff", "```diff", diff, "```");
  return lines.join("\n");
}

export const agentContextCommand: CommandDefinition = {
  name: "agent-context",
  description:
    "Bounded deterministic context pack for a feature (kinds: ui|actions)",
  handler: async (ctx) => {
    const featureName = ctx.args[0];
    if (featureName === undefined) {
      warn(
        "usage: bundar agent-context <feature> [--app dir] [--kind ui|actions]",
      );
      return 1;
    }
    const appRel =
      typeof ctx.flags["app"] === "string"
        ? (ctx.flags["app"] as string)
        : "examples/todo";
    const kindRaw =
      typeof ctx.flags["kind"] === "string"
        ? (ctx.flags["kind"] as string)
        : "ui";
    if (kindRaw !== "ui" && kindRaw !== "actions") {
      warn(`unknown kind ${JSON.stringify(kindRaw)} (supported: ui, actions)`);
      return 1;
    }
    return runPack(ctx, appRel, featureName, kindRaw as ContextKind);
  },
};
