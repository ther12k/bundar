/**
 * CLI for the local OKF validator (GH-003).
 *
 * Subcommands:
 *   validate — full structural validation of the bundle
 *   links    — internal link check only
 *   graph    — issue dependency-graph summary
 *
 * Every successful output states that this is local structural validation,
 * not external certification.
 */
import { loadCorpus } from "./corpus";
import {
  validateConceptFrontmatter,
  validateIssues,
  validateLinks,
  validateRootMetadata,
} from "./rules";

const DISCLAIMER =
  "local structural validation only — it is not certification by Google or any third party";

function reportViolations(
  command: string,
  violations: readonly string[],
): number {
  if (violations.length > 0) {
    console.error(`${command}: failed with ${violations.length} violation(s):`);
    for (const violation of violations) {
      console.error(`  - ${violation}`);
    }
    return 1;
  }
  return 0;
}

function commandValidate(): number {
  const corpus = loadCorpus();
  const violations = [
    ...validateRootMetadata(),
    ...validateConceptFrontmatter(corpus.concepts),
    ...validateLinks(corpus.concepts),
    ...validateIssues(corpus),
  ];
  const exitCode = reportViolations("docs:validate", violations);
  if (exitCode === 0) {
    console.log(
      `docs:validate: ok (${corpus.concepts.length} documents, ` +
        `${corpus.issues.length} issues, ${DISCLAIMER})`,
    );
  }
  return exitCode;
}

function commandLinks(): number {
  const corpus = loadCorpus();
  const violations = validateLinks(corpus.concepts);
  const exitCode = reportViolations("docs:links", violations);
  if (exitCode === 0) {
    let linkCount = 0;
    for (const concept of corpus.concepts) linkCount += concept.links.length;
    console.log(
      `docs:links: ok (${linkCount} links across ${corpus.concepts.length} documents)`,
    );
  }
  return exitCode;
}

function commandGraph(): number {
  const corpus = loadCorpus();
  const violations = validateIssues(corpus);
  const exitCode = reportViolations("issues:graph", violations);
  if (exitCode !== 0) return exitCode;

  const byMilestone = new Map<string, number>();
  let edgeCount = 0;
  const roots: string[] = [];
  for (const issue of corpus.issues) {
    const milestone = issue.milestone ?? "(none)";
    byMilestone.set(milestone, (byMilestone.get(milestone) ?? 0) + 1);
    edgeCount += issue.dependsOn.length;
    if (issue.stableId !== null && issue.dependsOn.length === 0)
      roots.push(issue.stableId);
  }

  console.log(
    `issues:graph: ${corpus.issues.length} issues, ${edgeCount} dependency edges, no cycles`,
  );
  for (const [milestone, count] of byMilestone) {
    console.log(`  ${milestone}: ${count}`);
  }
  console.log(`  graph roots: ${roots.join(", ")}`);
  return 0;
}

const command = process.argv[2] ?? "validate";
let exitCode: number;
switch (command) {
  case "validate":
    exitCode = commandValidate();
    break;
  case "links":
    exitCode = commandLinks();
    break;
  case "graph":
    exitCode = commandGraph();
    break;
  default:
    console.error(
      `unknown subcommand "${command}"; expected validate, links, or graph`,
    );
    exitCode = 2;
}
process.exit(exitCode);
