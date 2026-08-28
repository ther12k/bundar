import { describe, expect, test } from "bun:test";
import type { Concept, IssueRecord } from "./corpus";
import { loadCorpus } from "./corpus";
import {
  validateConceptFrontmatter,
  validateIssues,
  validateLinks,
  validateRootMetadata,
  validateCorpus,
} from "./rules";

function concept(partial: Partial<Concept>): Concept {
  return {
    path: "project/example.md",
    isReserved: false,
    frontmatter: null,
    frontmatterError: null,
    links: [],
    ...partial,
  };
}

function issue(partial: Partial<IssueRecord>): IssueRecord {
  return {
    path: "issues/m0/gh-999-example.md",
    stableId: "GH-999",
    milestone: null,
    dependsOn: [],
    blocks: [],
    ...partial,
  };
}

describe("okf-validator concept rules", () => {
  test("accepts a concept with frontmatter and a non-empty type", () => {
    const violations = validateConceptFrontmatter([
      concept({ frontmatter: { type: "Reference" } }),
    ]);
    expect(violations).toEqual([]);
  });

  test("rejects missing frontmatter, empty type, and unparseable frontmatter", () => {
    const violations = validateConceptFrontmatter([
      concept({}),
      concept({ frontmatter: { type: "   " } }),
      concept({ frontmatter: null, frontmatterError: "bad indentation" }),
    ]);
    expect(violations.length).toBe(3);
  });

  test("reserved files must not declare a concept type", () => {
    const violations = validateConceptFrontmatter([
      concept({
        path: "project/index.md",
        isReserved: true,
        frontmatter: { type: "Index" },
      }),
      concept({ path: "log.md", isReserved: true, frontmatter: null }),
    ]);
    expect(violations).toEqual([
      "project/index.md: reserved file must not declare a concept type",
    ]);
  });
});

describe("okf-validator link rules", () => {
  test("reports broken links and accepts existing targets", () => {
    const violations = validateLinks([
      concept({ path: "README.md", links: ["log.md", "does-not-exist.md"] }),
    ]);
    expect(violations).toEqual([
      'README.md: broken link to "does-not-exist.md"',
    ]);
  });

  test("external URLs and anchors are out of scope", () => {
    const violations = validateLinks([
      concept({
        path: "README.md",
        links: ["https://example.com/x.md", "mailto:a@b.c", "#section"],
      }),
    ]);
    expect(violations).toEqual([]);
  });
});

describe("okf-validator issue rules", () => {
  test("detects duplicate stable IDs and unknown dependency targets", () => {
    const violations = validateIssues({
      concepts: [],
      issues: [
        issue({ stableId: "GH-100" }),
        issue({ path: "issues/m1/gh-100-duplicate.md", stableId: "GH-100" }),
        issue({
          path: "issues/m1/gh-101-deps.md",
          stableId: "GH-101",
          dependsOn: ["GH-404"],
          blocks: ["GH-405"],
        }),
      ],
    });
    expect(violations).toContain(
      "duplicate stable issue ID GH-100 (also in an earlier file)",
    );
    expect(violations).toContain(
      "issues/m1/gh-101-deps.md: depends on unknown issue GH-404",
    );
    expect(violations).toContain(
      "issues/m1/gh-101-deps.md: blocks unknown issue GH-405",
    );
  });

  test("rejects malformed stable IDs", () => {
    const violations = validateIssues({
      concepts: [],
      issues: [issue({ stableId: "issue-7" })],
    });
    expect(violations).toContain(
      'issues/m0/gh-999-example.md: stable ID "issue-7" must match GH-###',
    );
  });

  test("detects dependency cycles", () => {
    const violations = validateIssues({
      concepts: [],
      issues: [
        issue({ stableId: "GH-100", dependsOn: ["GH-101"] }),
        issue({ stableId: "GH-101", dependsOn: ["GH-102"] }),
        issue({ stableId: "GH-102", dependsOn: ["GH-100"] }),
      ],
    });
    expect(
      violations.find((v) => v.startsWith("dependency cycle:")),
    ).toBeDefined();
  });

  test("accepts an acyclic graph with known targets", () => {
    const violations = validateIssues({
      concepts: [],
      issues: [
        issue({ stableId: "GH-100" }),
        issue({ stableId: "GH-101", dependsOn: ["GH-100"] }),
      ],
    });
    expect(violations).toEqual([]);
  });
});

describe("okf-validator on the real bundle", () => {
  test("the repository corpus passes full structural validation", () => {
    const corpus = loadCorpus();
    expect(corpus.concepts.length).toBeGreaterThan(100);
    expect(corpus.issues.length).toBe(100);
    expect(validateRootMetadata()).toEqual([]);
    expect(validateCorpus(corpus)).toEqual([]);
  });
});
