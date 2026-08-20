/**
 * Pure validation rules for the OKF corpus (GH-003).
 *
 * Rules return violation strings; the CLI decides exit codes and output.
 * Structural only: passing validation is not certification by any external
 * party, and the CLI states this on every successful run.
 */
import type { Concept, Corpus, IssueRecord } from "./corpus";
import { BUNDLE_ROOT, resolveLinkTarget } from "./corpus";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Violation = string;

const STABLE_ID_PATTERN = /^GH-\d{3}$/;

export function validateRootMetadata(): Violation[] {
  const violations: Violation[] = [];
  const rootIndexPath = join(BUNDLE_ROOT, "index.md");
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(
    readFileSync(rootIndexPath, "utf8"),
  );
  const declared = match?.[1];
  if (!declared?.includes('okf_version: "0.2"')) {
    violations.push('bundle root index.md must declare okf_version: "0.2"');
  }
  if (
    !/okf_version/.test(declared ?? "") ||
    /(^|\n)(type|title):/.test(declared ?? "")
  ) {
    violations.push(
      "bundle root index.md is reserved and must not carry concept frontmatter beyond okf_version",
    );
  }
  return violations;
}

export function validateConceptFrontmatter(
  concepts: readonly Concept[],
): Violation[] {
  const violations: Violation[] = [];
  for (const concept of concepts) {
    if (concept.frontmatterError !== null) {
      violations.push(
        `${concept.path}: unparseable frontmatter (${concept.frontmatterError})`,
      );
      continue;
    }
    const declaredType = concept.frontmatter?.["type"];
    if (concept.isReserved) {
      if (declaredType !== undefined) {
        violations.push(
          `${concept.path}: reserved file must not declare a concept type`,
        );
      }
      continue;
    }
    if (concept.frontmatter === null) {
      violations.push(`${concept.path}: missing frontmatter`);
      continue;
    }
    if (typeof declaredType !== "string" || declaredType.trim() === "") {
      violations.push(
        `${concept.path}: frontmatter must declare a non-empty type`,
      );
    }
  }
  return violations;
}

export function validateLinks(concepts: readonly Concept[]): Violation[] {
  const violations: Violation[] = [];
  for (const concept of concepts) {
    for (const target of concept.links) {
      const missing = resolveLinkTarget(concept.path, target);
      if (missing !== null) {
        violations.push(`${concept.path}: broken link to "${target}"`);
      }
    }
  }
  return violations;
}

function findCycle(issues: readonly IssueRecord[]): string[] | null {
  const edges = new Map<string, string[]>();
  for (const issue of issues) {
    if (issue.stableId !== null) edges.set(issue.stableId, issue.dependsOn);
  }
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];

  function visit(id: string): string[] | null {
    const status = state.get(id);
    if (status === "done") return null;
    if (status === "visiting") {
      const cycleStart = stack.indexOf(id);
      return [...stack.slice(cycleStart), id];
    }
    state.set(id, "visiting");
    stack.push(id);
    for (const dependency of edges.get(id) ?? []) {
      if (edges.has(dependency)) {
        const cycle = visit(dependency);
        if (cycle !== null) return cycle;
      }
    }
    stack.pop();
    state.set(id, "done");
    return null;
  }

  for (const id of edges.keys()) {
    const cycle = visit(id);
    if (cycle !== null) return cycle;
  }
  return null;
}

export function validateIssues(corpus: Corpus): Violation[] {
  const violations: Violation[] = [];
  const issues = corpus.issues;
  const knownIds = new Set<string>();

  for (const issue of issues) {
    if (issue.stableId === null) {
      violations.push(
        `${issue.path}: issue metadata must declare issue.stable_id`,
      );
      continue;
    }
    if (!STABLE_ID_PATTERN.test(issue.stableId)) {
      violations.push(
        `${issue.path}: stable ID "${issue.stableId}" must match GH-###`,
      );
    }
    if (knownIds.has(issue.stableId)) {
      violations.push(
        `duplicate stable issue ID ${issue.stableId} (also in an earlier file)`,
      );
    }
    knownIds.add(issue.stableId);
  }

  for (const issue of issues) {
    if (issue.stableId === null) continue;
    for (const dependency of issue.dependsOn) {
      if (!knownIds.has(dependency)) {
        violations.push(
          `${issue.path}: depends on unknown issue ${dependency}`,
        );
      }
    }
    for (const blocked of issue.blocks) {
      if (!knownIds.has(blocked)) {
        violations.push(`${issue.path}: blocks unknown issue ${blocked}`);
      }
    }
  }

  const cycle = findCycle(issues);
  if (cycle !== null) {
    violations.push(`dependency cycle: ${cycle.join(" -> ")}`);
  }

  return violations;
}

export function validateCorpus(corpus: Corpus): Violation[] {
  return [
    ...validateRootMetadata(),
    ...validateConceptFrontmatter(corpus.concepts),
    ...validateLinks(corpus.concepts),
    ...validateIssues(corpus),
  ];
}
