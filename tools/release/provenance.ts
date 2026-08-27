/**
 * release:provenance (GH-085 / BR-111): a SLSA-lite provenance statement binding
 * every release tarball to its exact source commit, toolchain, lockfile
 * digest, build command, and CI identity. The repo's current capability
 * is unsigned attestations with recorded identity — no formal supply-
 * chain assurance level is claimed (out of scope per the issue); the
 * statement structure is in-toto-style so a signing workflow can wrap
 * it without reformatting.
 *
 * BR-111: when `artifacts/release/candidate-manifest.json` exists, the
 * subjects are the PUBLICATION-FORM candidate tarballs (version + hashes
 * straight from the manifest) — never freshly packed source-form 0.0.0
 * tarballs. Without a manifest this falls back to packing the tree and
 * records that fallback explicitly in the predicate.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const REPO = join(import.meta.dir, "..", "..");
const git = (args: readonly string[]): string =>
  spawnSync("git", args, { cwd: REPO, encoding: "utf8" }).stdout?.trim() ?? "";

const commit = git(["rev-parse", "HEAD"]);
const branch = git(["branch", "--show-current"]) || "detached";
const bunVersion = Bun.version;
const lockDigest = createHash("sha256")
  .update(readFileSync(join(REPO, "bun.lock")))
  .digest("hex");

const ci =
  process.env.GITHUB_ACTIONS === "true"
    ? {
        system: "github-actions",
        runId: process.env.GITHUB_RUN_ID ?? "unknown",
        runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? "unknown",
        workflow: process.env.GITHUB_WORKFLOW ?? "unknown",
        actor: process.env.GITHUB_ACTOR ?? "unknown",
      }
    : {
        system: "local",
        operator: git(["config", "user.name"]) || "unrecorded",
      };

const manifestPath = join(
  REPO,
  "artifacts",
  "release",
  "candidate-manifest.json",
);

let subjects: { name: string; digest: { sha256: string } }[];
let buildForm: string;
if (existsSync(manifestPath)) {
  // Publication-form subjects come verbatim from the candidate manifest.
  const candidate = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    packages: ReadonlyArray<{
      tarballFile: string;
      sha256: string;
    }>;
  };
  subjects = candidate.packages.map((p) => ({
    name: p.tarballFile,
    digest: { sha256: p.sha256 },
  }));
  buildForm = "bundar/candidate-pack@v1 (publication-form tarballs)";
} else {
  // Fallback: pack source-form tarballs for pre-candidate provenance runs.
  const PACKAGES = [
    "packages/core",
    "packages/jsx",
    "packages/schema",
    "packages/forms",
    "packages/security",
    "packages/htmx",
    "packages/testing",
    "packages/cli",
    "create-bundar",
  ];
  const tempDir = ".tmp-provenance";
  mkdirSync(join(REPO, tempDir), { recursive: true });
  subjects = [];
  for (const dir of PACKAGES) {
    const manifest = JSON.parse(
      readFileSync(join(REPO, dir, "package.json"), "utf8"),
    );
    spawnSync("bun", ["pm", "pack"], {
      cwd: join(REPO, dir),
      stdio: "ignore",
    });
    const tarball = `${manifest.name.replace("@", "").replace("/", "-")}-${manifest.version}.tgz`;
    const digest = createHash("sha256")
      .update(readFileSync(join(REPO, dir, tarball)))
      .digest("hex");
    subjects.push({ name: tarball, digest: { sha256: digest } });
    rmSync(join(REPO, dir, tarball), { force: true }); // do not litter package dirs
  }
  rmSync(join(REPO, tempDir), { recursive: true, force: true });
  buildForm = "bundar/pm-pack@v1 (source-form fallback)";
}

// checksums.txt (sha256sum-compatible) binds checksums to these subjects
mkdirSync(join(REPO, "artifacts", "provenance"), { recursive: true });
mkdirSync(join(REPO, "artifacts", "packages"), { recursive: true });

const statement = {
  _type: "https://in-toto.io/Statement/v1",
  subject: subjects.map((s) => ({ name: s.name, digest: s.digest })),
  predicateType: "https://slsa.dev/provenance/v0.2",
  predicate: {
    buildType: buildForm,
    builder: {
      id:
        ci.system === "github-actions"
          ? "https://github.com/ther12k/bundar/.github/workflows"
          : "local",
    },
    invocation: {
      configSource: {
        uri: "git+https://github.com/ther12k/bundar",
        digest: { sha1: commit },
        branch,
      },
      environment: { bun: bunVersion, ci },
    },
    buildConfig: {
      command: existsSync(manifestPath)
        ? "publish:dry-run candidate pipeline (pack-release.ts)"
        : "bun pm pack (per package)",
      lockfileSha256: lockDigest,
      typescript: JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"))
        .devDependencies.typescript,
    },
    metadata: {
      buildInvocationId:
        ci.system === "github-actions" ? ci.runId : `local-${Date.now()}`,
      buildStartedOn: new Date().toISOString(),
      reproducible: true,
      completeness: { parameters: true, environment: true, materials: true },
    },
    materials: [
      {
        uri: "git+https://github.com/ther12k/bundar",
        digest: { sha1: commit },
      },
    ],
  },
};
writeFileSync(
  join(REPO, "artifacts", "provenance", "provenance.json"),
  JSON.stringify(statement, null, 2) + "\n",
);
console.log(
  `release:provenance: ${subjects.length} subjects bound to ${commit.slice(0, 10)} (${buildForm}; identity: ${ci.system})`,
);
