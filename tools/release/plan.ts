/**
 * `release:plan` (BR-078 / ADR-0021): noninteractive, side-effect-free
 * validation of the frozen pre-1.0 versioning and publication policy
 * against the working tree, plus a human/JSON print of the intended
 * publication plan.
 *
 * Fails (exit 1) on any invariant from ADR-0021:
 *   1. any in-repo manifest version != 0.0.0 (no partial bumps, no
 *      premature publication posture)
 *   2. any private flag != true (the flip happens on the publication
 *      commit, for ALL packages at once)
 *   3. an internal dependency edge using anything but workspace:*
 *   4. an internal dependency naming an unknown package
 *   5. an external runtime dependency inside @bundar/core or @bundar/jsx
 *      (frozen zero-runtime-dependency boundary)
 *   6. HTMX4_TESTED_VERSION losing its prerelease hyphen while the M7
 *      descope record stands (GA-looking pin, GA chain not planned)
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");

/** The nine public packages ADR-0021 versions in lockstep. */
export const POLICY = {
  schema: "bundar.release-plan/1",
  synchronizedLine: "0.1.0",
  firstRegistryVersion: "0.1.0-alpha.2",
  sourceOnlyPredecessor: "v0.1.0-alpha.1",
  distTags: {
    alpha: "moving prerelease tag (canary through beta gate)",
    beta: "moving prerelease tag once BR-085 passes; alpha freezes",
    latest: "EMPTY until stable 0.1.0 — no prerelease may claim it",
    next: "EMPTY and reserved — future stable-line prerelease channel only",
  },
  internalRangeInRepo: "workspace:*",
  internalRangePublished: "^0.1.0-alpha.2",
  zeroRuntimeDeps: ["@bundar/core", "@bundar/jsx"],
  packages: [
    "packages/core",
    "packages/jsx",
    "packages/schema",
    "packages/forms",
    "packages/security",
    "packages/htmx",
    "packages/cli",
    "packages/testing",
    "create-bundar",
  ],
} as const;

interface Manifest {
  readonly dir: string;
  readonly name: string;
  readonly version: string;
  readonly private: boolean;
  readonly dependencies: Readonly<Record<string, string>>;
}

export interface PlanViolation {
  readonly rule: string;
  readonly package: string;
  readonly detail: string;
}

export function loadManifests(
  root: string,
  dirs: readonly string[] = POLICY.packages,
): Manifest[] {
  return dirs.map((dir) => {
    const raw = JSON.parse(
      readFileSync(join(root, dir, "package.json"), "utf8"),
    ) as {
      name: string;
      version: string;
      private?: boolean;
      dependencies?: Record<string, string>;
    };
    return {
      dir,
      name: raw.name,
      version: raw.version,
      private: raw.private === true,
      dependencies: raw.dependencies ?? {},
    };
  });
}

/** Pure invariant check over loaded manifests + environment facts. */
export function validatePolicy(
  manifests: readonly Manifest[],
  facts: {
    readonly htmx4Prerelease: boolean;
    readonly m7DescopeStands: boolean;
  },
): PlanViolation[] {
  const violations: PlanViolation[] = [];
  const names = new Set(manifests.map((m) => m.name));

  for (const m of manifests) {
    if (m.version !== "0.0.0")
      violations.push({
        rule: "synchronized-zero",
        package: m.name,
        detail: `version is ${m.version}; in-repo manifests stay 0.0.0 until the publication commit (ADR-0021 §1)`,
      });
    if (!m.private)
      violations.push({
        rule: "private-until-publish",
        package: m.name,
        detail:
          "private flag is false before the publication commit (ADR-0021 §1)",
      });

    for (const [dep, spec] of Object.entries(m.dependencies)) {
      const internal = dep.startsWith("@bundar/") || dep === "create-bundar";
      if (!internal) {
        if (
          POLICY.zeroRuntimeDeps.includes(
            m.name as (typeof POLICY.zeroRuntimeDeps)[number],
          )
        )
          violations.push({
            rule: "zero-runtime-deps",
            package: m.name,
            detail: `external runtime dependency ${dep} (${spec}) in a zero-runtime-dependency package (ADR-0021 §4)`,
          });
        continue;
      }
      if (!names.has(dep))
        violations.push({
          rule: "unknown-internal-dep",
          package: m.name,
          detail: `${dep} is not a workspace package`,
        });
      if (spec !== POLICY.internalRangeInRepo)
        violations.push({
          rule: "workspace-spec-only",
          package: m.name,
          detail: `${dep} uses "${spec}"; internal edges are workspace:* in-repo (ADR-0021 §4)`,
        });
    }
  }

  if (facts.m7DescopeStands && !facts.htmx4Prerelease)
    violations.push({
      rule: "htmx4-ga-pin-contradiction",
      package: "@bundar/htmx",
      detail:
        "HTMX4_TESTED_VERSION is not a prerelease while the M7 descope record stands — a GA-looking pin with no GA chain (ADR-0021 §3)",
    });

  return violations;
}

function htmx4Pin(root: string): string | null {
  const path = join(root, "packages/htmx/src/dialects/v4/index.ts");
  if (!existsSync(path)) return null;
  const match = readFileSync(path, "utf8").match(
    /HTMX4_TESTED_VERSION = "([^"]+)"/,
  );
  return match?.[1] ?? null;
}

function main(): void {
  const asJson = process.argv.includes("--json");
  const manifests = loadManifests(ROOT);
  const pin = htmx4Pin(ROOT);
  if (pin === null) {
    console.error("release:plan: HTMX4_TESTED_VERSION not found");
    process.exit(1);
  }
  const violations = validatePolicy(manifests, {
    htmx4Prerelease: pin.includes("-"),
    m7DescopeStands: existsSync(join(ROOT, "delivery/descopes/m7-htmx4-ga.md")),
  });

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          policy: POLICY,
          htmx4Pin: pin,
          violations,
          ok: violations.length === 0,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`release:plan — ${POLICY.schema} (ADR-0021)`);
    console.log(
      `  first registry version : ${POLICY.firstRegistryVersion} (dist-tag alpha; ` +
        `continues source-only ${POLICY.sourceOnlyPredecessor})`,
    );
    console.log(
      `  dist-tags              : alpha=canary · beta=after BR-085 · latest=EMPTY until 0.1.0 · next=reserved EMPTY`,
    );
    console.log(
      `  internal ranges        : in-repo ${POLICY.internalRangeInRepo} → published ${POLICY.internalRangePublished}`,
    );
    console.log(
      `  packages (${manifests.length})    : ${manifests.map((m) => m.name).join(", ")}`,
    );
    console.log(
      `  htmx4 pin              : ${pin} (${pin.includes("-") ? "prerelease" : "RELEASE"})`,
    );
    for (const v of violations)
      console.error(`  DRIFT [${v.rule}] ${v.package}: ${v.detail}`);
  }

  if (violations.length > 0) {
    console.error(
      `release:plan: ${violations.length} policy violation(s) — see ADR-0021`,
    );
    process.exit(1);
  }
  if (!asJson) console.log("release:plan: ok");
}

if (import.meta.main) main();
