/**
 * GH-169 workflow-security static guards.
 *
 * These tests pin the trust-boundary properties of the release workflows
 * that cannot be exercised end-to-end without live credentials:
 *
 * 1. Release workflow inputs never enter `run:` shell bodies directly
 *    (GitHub interpolates ${{ }} before the shell parses the script —
 *    a shell-injection vector in the secret-bearing publish job).
 * 2. The battery run is only accepted after a fail-closed metadata gate
 *    (conclusion success, completed status, workflow_dispatch event,
 *    candidate-release workflow path, exact head SHA).
 * 3. The artifact digest input is mandatory and format-checked; the tag
 *    input is allowlisted (canary|alpha|beta), the version strictly semver.
 * 4. pull_request events never run on the persistent self-hosted halotec
 *    runners — untrusted PR code executes on ephemeral GitHub-hosted VMs.
 * 5. Maintainer docs describe no local live-publish path (Model B only).
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = join(import.meta.dir, "..", "..");
const read = (rel: string): string => readFileSync(join(REPO, rel), "utf8");

const release = read(".github/workflows/release.yml");

describe("GH-169 release workflow input hygiene", () => {
  test("workflow_dispatch inputs appear ONLY in env: mappings, never in run bodies", () => {
    // Every reference to github.event.inputs must be an env assignment
    // (UPPER_CASE_KEY: ${{ github.event.inputs.* }}) — those are injected
    // as real environment variables, not spliced into shell source.
    const offenders = release
      .split("\n")
      .filter((line) => line.includes("github.event.inputs"))
      // env: mappings inject real variables (safe); job-level `if:` is a
      // GitHub expression context, never shell source (also safe).
      .filter(
        (line) =>
          !/^\s+[A-Z_]+: \$\{\{ github\.event\.inputs\./.test(line) &&
          !/^\s*if: github\.event\.inputs\./.test(line),
      );
    expect(offenders).toEqual([]);

    // And no run body interpolates inputs into command arguments.
    expect(release).not.toContain('--tag "${{');
    expect(release).not.toContain('"${{ github.event.inputs');
  });

  test("expected_artifact_digest is a mandatory input", () => {
    expect(release).toMatch(
      /expected_artifact_digest:[\s\S]{0,220}?required: true/,
    );
    expect(release).not.toMatch(
      /expected_artifact_digest[\s\S]{0,80}required: false/,
    );
  });

  test("tag allowlist, semver, and digest formats are enforced in both jobs", () => {
    // canary|alpha|beta case-allowlist appears once per guarded job.
    expect(release.match(/canary\|alpha\|beta\)/g)?.length).toBe(2);
    expect(
      release.split('$INPUT_VERSION" =~ ^[0-9]+\\.[0-9]+\\.[0-9]+').length - 1,
    ).toBe(2);
    expect(
      release.split("sha256:[0-9a-f]{64}").length - 1,
    ).toBeGreaterThanOrEqual(2);
  });

  test("the battery run must pass a fail-closed metadata gate before any artifact access", () => {
    for (const marker of [
      '"completed"',
      '"success"',
      '"workflow_dispatch"',
      '".github/workflows/candidate-release.yml"',
      "head_sha",
    ]) {
      expect(
        release.match(new RegExp(marker.replace(/[.$"]/g, "\\$&"), "g"))
          ?.length,
      ).toBeGreaterThanOrEqual(2);
    }
    // The metadata gate must run BEFORE the bundle download step.
    const gateIndex = release.indexOf(
      "Validate inputs and the authoritative battery run",
    );
    const downloadIndex = release.indexOf(
      "Download the authoritative candidate bundle",
    );
    expect(gateIndex).toBeGreaterThanOrEqual(0);
    expect(downloadIndex).toBeGreaterThan(gateIndex);
  });

  test("least-privilege permissions are declared", () => {
    expect(release).toMatch(
      /^permissions:\n {2}contents: read\n {2}actions: read$/m,
    );
  });
});

describe("GH-169 untrusted PR code never runs on self-hosted runners", () => {
  const ci = read(".github/workflows/ci.yml");

  test("every CI job routes pull_request events to GitHub-hosted VMs", () => {
    const runsOn = ci
      .split("\n")
      .filter((line) => line.trim().startsWith("runs-on:"));
    expect(runsOn.length).toBe(4);
    for (const line of runsOn) {
      expect(line).toContain("github.event_name == 'push'");
      expect(line).toContain("ubuntu-latest");
      expect(line).toContain('["self-hosted", "halotec"]');
    }
    // No job pins the self-hosted runner unconditionally.
    expect(ci).not.toMatch(/^\s*runs-on: \[self-hosted, halotec\]$/m);
  });

  test("workflow-level default is contents: read; only verify elevates issues", () => {
    expect(ci).toMatch(/^permissions:\n {2}contents: read$/m);
    const issuesScopes = ci
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line === "issues: read");
    expect(issuesScopes.length).toBe(1);
  });

  test("the battery workflow declares least privilege for its evidence upload", () => {
    const battery = read(".github/workflows/candidate-release.yml");
    expect(battery).toMatch(
      /^permissions:\n {2}contents: read\n {2}actions: write$/m,
    );
  });
});

describe("GH-171 release hygiene", () => {
  test("both Release jobs run only on main; battery must have run on main", () => {
    // Job-level ref guards (defense-in-depth; the environment deployment
    // branch policy recorded in gate #130 is the primary boundary).
    expect(release).toMatch(/if: github\.ref == 'refs\/heads\/main'$/m);
    expect(release).toMatch(
      /if: github\.event\.inputs\.dry_run_only != 'true' && github\.ref == 'refs\/heads\/main'$/m,
    );
    // The metadata gate rejects batteries from non-main branches.
    expect(release.split('meta.get("head_branch") != "main"').length - 1).toBe(
      2,
    );
  });

  test("the publish job removes the committed preflight report before auth/publish", () => {
    const clearIndex = release.indexOf("Clear committed evidence reports");
    const authIndex = release.indexOf("Authenticate npm");
    expect(clearIndex).toBeGreaterThan(0);
    expect(authIndex).toBeGreaterThan(clearIndex);
    expect(release).toMatch(/rm -f artifacts\/registry-verify\.json/);
    // The report upload remains if: always() — it must only ever pick up
    // a report written by THIS attempt (the verifier writes it post-publish).
    expect(release).toMatch(/name: Upload publish report\n {8}if: always\(\)/);
  });

  test("the publish job holds no GITHUB_TOKEN write escalation", () => {
    // upload-artifact uses the job's runtime token; actions: write next to
    // npm credentials is unjustified scope.
    expect(release).toMatch(
      /permissions:\n {6}contents: read\n {6}actions: read/m,
    );
    expect(release).not.toMatch(/actions: write/);
  });

  test("docs record the deployment-branch policy as mandatory", () => {
    const gate = read("delivery/gates/registry.md");
    expect(gate).toContain("deployment branch policy");
    expect(gate).toContain("Prevent self-review".toLowerCase());
    const publishing = read("docs/maintainers/publishing.md");
    expect(publishing).toContain("deployment branches");
  });
});

describe("GH-169 maintainer docs are Model B only", () => {
  test("publishing guide offers no local live-publish command", () => {
    const publishing = read("docs/maintainers/publishing.md");
    // The only local publish:approved invocation is the dry-run rehearsal.
    const liveMatches = publishing
      .split("\n")
      .filter((line) => line.includes("bun run publish:approved"))
      .filter((line) => !line.includes("--dry-run"));
    expect(liveMatches).toEqual([]);
    expect(publishing).toContain("DIAGNOSTIC REHEARSAL ONLY");
    expect(publishing).toContain("mandatory");
  });

  test("registry gate publishes only through the human-gated workflow", () => {
    const gate = read("delivery/gates/registry.md");
    expect(gate).not.toContain("publish:approved -- --tag canary");
    expect(gate).toContain("battery_run_id");
    expect(gate).toContain("expected_artifact_digest");
  });
});
