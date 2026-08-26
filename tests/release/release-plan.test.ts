/**
 * BR-078 release:plan policy validator tests (ADR-0021).
 * The pure validator is exercised against synthetic manifests; the CLI
 * path is exercised against the real tree.
 */
import { describe, expect, test } from "bun:test";
import {
  POLICY,
  loadManifests,
  validatePolicy,
} from "../../tools/release/plan";
import { join } from "node:path";

const REPO = join(import.meta.dir, "..", "..");

function manifest(
  overrides: Partial<Parameters<typeof validatePolicy>[0][number]>,
) {
  return {
    dir: "packages/x",
    name: "@bundar/x",
    version: "0.0.0",
    private: true,
    dependencies: {},
    ...overrides,
  };
}

const OK_FACTS = { htmx4Prerelease: true, m7DescopeStands: true };

describe("BR-078 release:plan invariants (ADR-0021)", () => {
  test("a conformant tree produces zero violations", () => {
    expect(
      validatePolicy(
        [
          manifest({ name: "@bundar/core", dependencies: {} }),
          manifest({ name: "@bundar/jsx", dependencies: {} }),
          manifest({ name: "@bundar/forms", dependencies: {} }),
          manifest({
            name: "@bundar/htmx",
            dependencies: {
              "@bundar/forms": "workspace:*",
              "@bundar/jsx": "workspace:*",
            },
          }),
        ],
        OK_FACTS,
      ),
    ).toEqual([]);
  });

  test("rule 1: any non-0.0.0 version is a partial-bump drift", () => {
    const out = validatePolicy(
      [manifest({ version: "0.1.0-alpha.2" })],
      OK_FACTS,
    );
    expect(out.length).toBe(1);
    expect(out[0]!.rule).toBe("synchronized-zero");
  });

  test("rule 2: private:false before the publication commit fails", () => {
    const out = validatePolicy([manifest({ private: false })], OK_FACTS);
    expect(out.length).toBe(1);
    expect(out[0]!.rule).toBe("private-until-publish");
  });

  test("rule 3: an internal edge with a non-workspace specifier fails", () => {
    const out = validatePolicy(
      [
        manifest({ name: "@bundar/core", dependencies: {} }),
        manifest({
          name: "@bundar/forms",
          dependencies: { "@bundar/core": "^0.1.0" },
        }),
      ],
      OK_FACTS,
    );
    expect(out.length).toBe(1);
    expect(out[0]!.rule).toBe("workspace-spec-only");
  });

  test("rule 4: an internal edge naming an unknown package fails", () => {
    const out = validatePolicy(
      [manifest({ dependencies: { "@bundar/nope": "workspace:*" } })],
      OK_FACTS,
    );
    expect(out.length).toBe(1);
    expect(out[0]!.rule).toBe("unknown-internal-dep");
  });

  test("rule 5: external runtime deps fail ONLY in zero-runtime packages", () => {
    const core = validatePolicy(
      [manifest({ name: "@bundar/core", dependencies: { hono: "^4" } })],
      OK_FACTS,
    );
    expect(core.length).toBe(1);
    expect(core[0]!.rule).toBe("zero-runtime-deps");
    // A non-zero-runtime package may declare external runtime deps.
    expect(
      validatePolicy(
        [manifest({ name: "@bundar/cli", dependencies: { hono: "^4" } })],
        OK_FACTS,
      ),
    ).toEqual([]);
  });

  test("rule 6: a GA-looking htmx4 pin contradicts the standing M7 descope", () => {
    const out = validatePolicy([manifest({})], {
      htmx4Prerelease: false,
      m7DescopeStands: true,
    });
    expect(out.length).toBe(1);
    expect(out[0]!.rule).toBe("htmx4-ga-pin-contradiction");
    // If M7 has been executed (descope gone), a GA pin is legitimate.
    expect(
      validatePolicy([manifest({})], {
        htmx4Prerelease: false,
        m7DescopeStands: false,
      }),
    ).toEqual([]);
  });

  test("the real tree passes: nine synchronized private packages, workspace-only edges", () => {
    const manifests = loadManifests(REPO);
    expect(manifests.map((m) => m.name).sort()).toEqual(
      [
        "@bundar/cli",
        "@bundar/core",
        "@bundar/forms",
        "@bundar/htmx",
        "@bundar/jsx",
        "@bundar/schema",
        "@bundar/security",
        "@bundar/testing",
        "create-bundar",
      ].sort(),
    );
    expect(
      validatePolicy(manifests, {
        htmx4Prerelease: true, // real pin 4.0.0-beta6
        m7DescopeStands: true,
      }),
    ).toEqual([]);
  });

  test("the frozen plan constants match ADR-0021", () => {
    expect(POLICY.firstRegistryVersion).toBe("0.1.0-alpha.2");
    expect(POLICY.internalRangeInRepo).toBe("workspace:*");
    expect(POLICY.internalRangePublished).toBe("^0.1.0-alpha.2");
    expect(POLICY.packages.length).toBe(9);
    expect(POLICY.distTags.latest).toContain("EMPTY");
    expect(POLICY.distTags.next).toContain("reserved");
  });
});
