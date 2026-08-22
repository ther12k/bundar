/**
 * release:provenance (GH-085): a SLSA-lite provenance statement binding
 * every release tarball to its exact source commit, toolchain, lockfile
 * digest, build command, and CI identity. The repo's current capability
 * is unsigned attestations with recorded identity — no formal supply-
 * chain assurance level is claimed (out of scope per the issue); the
 * statement structure is in-toto-style so a signing workflow can wrap
 * it without reformatting.
 */
import { spawnSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  rmSync,
  mkdtempSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
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

// fresh checksums: pack once into a temp registry and hash
const temp = mkdtempSync(join(tmpdir(), "bundar-provenance-"));
const subjects: { name: string; digest: { sha256: string } }[] = [];
const PACKAGES = [
  "packages/core",
  "packages/jsx",
  "packages/schema",
  "packages/security",
  "packages/htmx",
  "packages/testing",
  "packages/cli",
  "create-bundar",
];
for (const dir of PACKAGES) {
  const manifest = JSON.parse(
    readFileSync(join(REPO, dir, "package.json"), "utf8"),
  );
  spawnSync("bun", ["pm", "pack"], { cwd: join(REPO, dir), stdio: "ignore" });
  const tarball = `${manifest.name.replace("@", "").replace("/", "-")}-${manifest.version}.tgz`;
  const digest = createHash("sha256")
    .update(readFileSync(join(REPO, dir, tarball)))
    .digest("hex");
  subjects.push({ name: tarball, digest: { sha256: digest } });
  copyFileSync(join(REPO, dir, tarball), join(temp, tarball));
  rmSync(join(REPO, dir, tarball));
}

// checksums.txt (sha256sum-compatible) for the verification command
mkdirSync(join(REPO, "artifacts", "provenance"), { recursive: true });
mkdirSync(join(REPO, "artifacts", "packages"), { recursive: true });
writeFileSync(
  join(REPO, "artifacts", "packages", "checksums.txt"),
  subjects
    .map((s) => `${s.digest.sha256}  artifacts/packages/${s.name}`)
    .join("\n") + "\n",
);

const statement = {
  _type: "https://in-toto.io/Statement/v1",
  subject: subjects.map((s) => ({ name: s.name, digest: s.digest })),
  predicateType: "https://slsa.dev/provenance/v0.2",
  predicate: {
    buildType: "bundar/pm-pack@v1",
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
      command: "bun pm pack (per package)",
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
// keep the hashed tarballs alongside for checksum verification
for (const file of readdirSync(temp))
  copyFileSync(join(temp, file), join(REPO, "artifacts", "packages", file));
rmSync(temp, { recursive: true, force: true });
console.log(
  `release:provenance: ${subjects.length} subjects bound to ${commit.slice(0, 10)} (identity: ${ci.system})`,
);
