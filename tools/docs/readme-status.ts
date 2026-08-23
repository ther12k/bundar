/**
 * README status-facts drift check (BR-009).
 *
 * Fast-changing release, package, dialect, and milestone facts rendered in
 * README.md are verified against machine-readable source-of-truth files.
 * Narrative sections stay hand-edited; only the enumerated facts below are
 * gated. Every failure prints the fact id, the authoritative source, and the
 * exact expectation so drift is actionable at field level.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const readme = readFileSync(join(ROOT, "README.md"), "utf8");
const read = (rel: string): string => readFileSync(join(ROOT, rel), "utf8");

function htmxPin(rel: string, constant: string): string {
  const match = read(rel).match(new RegExp(`${constant} = "([^"]+)"`));
  if (!match) throw new Error(`pin constant ${constant} not found in ${rel}`);
  return match[1]!;
}

function bunEngine(): string {
  const manifest = JSON.parse(read("package.json")) as {
    engines: { bun: string };
  };
  return manifest.engines.bun;
}

function allWorkspacePackagesPrivate(): boolean {
  return readdirSync(join(ROOT, "packages"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map(
      (entry) =>
        JSON.parse(read(join("packages", entry.name, "package.json"))) as {
          private?: boolean;
        },
    )
    .every((manifest) => manifest.private === true);
}

function gitLatestTag(): string {
  const spawned = Bun.spawnSync(["git", "describe", "--abbrev=0", "--tags"], {
    cwd: ROOT,
  });
  const text = spawned.stdout.toString().trim();
  if (spawned.exitCode !== 0 || text.length === 0)
    throw new Error("no release tag found via git describe");
  return text;
}

interface Fact {
  id: string;
  source: string;
  needle: string;
  /** true: README must contain the needle; false: README must not. */
  requirePresent: boolean;
}

const htmx2 = htmxPin(
  "packages/htmx/src/dialects/v2/index.ts",
  "HTMX2_TESTED_VERSION",
);
const htmx4 = htmxPin(
  "packages/htmx/src/dialects/v4/index.ts",
  "HTMX4_TESTED_VERSION",
);

// The publication-posture fact is bidirectional: while every workspace
// package is private the README must claim "not yet published"; once any
// package publishes, that claim must be REMOVED in the same change.
const facts: Fact[] = [
  {
    id: "release-tag",
    source: "git tags (latest tag)",
    needle: gitLatestTag(),
    requirePresent: true,
  },
  {
    id: "bun-engine",
    source: "package.json engines.bun",
    needle: `\`${bunEngine()}\``,
    requirePresent: true,
  },
  {
    id: "htmx2-pin-stable",
    source: "HTMX2_TESTED_VERSION (v2 dialect)",
    needle: `\`${htmx2}\``,
    requirePresent: true,
  },
  {
    id: "htmx4-pin-experimental",
    source: "HTMX4_TESTED_VERSION (v4 dialect)",
    needle: `\`${htmx4}\``,
    requirePresent: true,
  },
  {
    id: "registry-unpublished-posture",
    source: "packages/*/package.json private flags",
    needle: "not yet been published to npm",
    requirePresent: allWorkspacePackagesPrivate(),
  },
  {
    id: "m7-external-block",
    source: "delivery/descopes/m7-htmx4-ga.md",
    needle: "closed as externally blocked",
    requirePresent: true,
  },
];

let failures = 0;
for (const fact of facts) {
  const present = readme.includes(fact.needle);
  if (present !== fact.requirePresent) {
    console.error(
      `docs:status-check: DRIFT ${fact.id}\n` +
        `  source of truth : ${fact.source}\n` +
        `  expected        : README ${fact.requirePresent ? "must contain" : "must NOT contain"} "${fact.needle}"\n` +
        `  actual          : substring ${present ? "found" : "absent"}\n` +
        `  fix             : update README.md to match the source (or both together).`,
    );
    failures += 1;
  }
}

if (failures > 0) {
  console.error(`docs:status-check: ${failures} drifted fact(s)`);
  process.exit(1);
}
console.log(`docs:status-check: ok (${facts.length} status facts verified)`);
