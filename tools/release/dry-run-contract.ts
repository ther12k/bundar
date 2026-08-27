/**
 * Canonical publication dry-run check contract (BR-112 audit wave 8).
 *
 * publish-dry-run's report is the evidence object that gates candidate
 * promotion — so release:verify may never trust the report's own declared
 * expectedCheckCount: a hand-written {success:true, expectedCheckCount:0,
 * checks:[]} would otherwise satisfy "every declared check passed".
 *
 * Writer and verifier therefore share this module:
 * - the canonical ordered check names are derived from PUBLISH_ORDER once;
 * - the writer fails loudly if its emitted checks deviate from the
 *   contract (internal naming invariant);
 * - the verifier enforces exact count/order/uniqueness/status on every
 *   report it reads — order is contractual because it mirrors the writer's
 *   deterministic emit sequence.
 */
import { PUBLISH_ORDER } from "./pack-release";

export interface DryRunCheckRecord {
  readonly check: string;
  readonly status: string;
  readonly detail?: string;
}

/**
 * The exact name sequence a SUCCESSFUL publication dry run emits, in emit
 * order: pack/version-sync once, then per package (dependency-first) the
 * cycle no-unpublished-paths → exports → metadata → readme, then the five
 * clean-consumer execution checks.
 */
export const canonicalDryRunChecks = (
  publishOrder: readonly string[] = PUBLISH_ORDER,
): string[] => [
  "pack+version-sync",
  ...publishOrder.flatMap((name) => [
    `no-unpublished-paths ${name}`,
    `exports ${name}`,
    `metadata ${name}`,
    `readme ${name}`,
  ]),
  "clean-install",
  "entry-points-import",
  "jsx-runtime",
  "tsx-typecheck",
  "cli-from-tarball",
];

export const PUBLICATION_DRY_RUN_CHECKS: readonly string[] =
  canonicalDryRunChecks();

export const EXPECTED_DRY_RUN_CHECK_COUNT = PUBLICATION_DRY_RUN_CHECKS.length;

export interface ContractValidation {
  readonly ok: boolean;
  readonly problems: readonly string[];
}

const firstDiff = (
  actual: readonly string[],
  canonical: readonly string[],
): number => {
  const limit = Math.max(actual.length, canonical.length);
  for (let index = 0; index < limit; index += 1) {
    if (actual[index] !== canonical[index]) return index;
  }
  return -1;
};

function describeCheckNames(checks: unknown): string[] {
  if (!Array.isArray(checks)) return [];
  return checks.map((entry) =>
    entry !== null &&
    typeof entry === "object" &&
    typeof (entry as DryRunCheckRecord).check === "string"
      ? (entry as DryRunCheckRecord).check
      : "<malformed-entry>",
  );
}

/**
 * Strictly validates a publish-dry-run.json payload against the canonical
 * contract: success must be true, expectedCheckCount must equal the
 * canonical count exactly (no caller-side fallback), names must match the
 * canonical sequence position-for-position (making duplicates, missing,
 * unknown, and reordered names all fail), and every status must be pass.
 */
export function validateDryRunChecks(report: unknown): ContractValidation {
  const problems: string[] = [];
  if (report === null || typeof report !== "object" || Array.isArray(report)) {
    return { ok: false, problems: ["dry-run report is not an object"] };
  }
  const typed = report as {
    success?: unknown;
    expectedCheckCount?: unknown;
    checks?: unknown;
  };

  if (typed.success !== true) {
    problems.push(
      `success=${JSON.stringify(typed.success)} — success:true required`,
    );
  }
  if (
    typeof typed.expectedCheckCount !== "number" ||
    !Number.isInteger(typed.expectedCheckCount) ||
    typed.expectedCheckCount !== EXPECTED_DRY_RUN_CHECK_COUNT
  ) {
    problems.push(
      `expectedCheckCount=${JSON.stringify(typed.expectedCheckCount)} — canonical ${EXPECTED_DRY_RUN_CHECK_COUNT} required; declared counts are never trusted`,
    );
  }
  if (!Array.isArray(typed.checks)) {
    problems.push("checks is not an array");
    return { ok: false, problems };
  }

  const entries = typed.checks as unknown[];
  const malformed = entries.filter(
    (entry) =>
      entry === null ||
      typeof entry !== "object" ||
      Array.isArray(entry) ||
      typeof (entry as DryRunCheckRecord).check !== "string",
  );
  if (malformed.length > 0) {
    problems.push(
      `${malformed.length} malformed check entr${malformed.length === 1 ? "y" : "ies"} (each needs string check/status fields)`,
    );
  }
  const names = describeCheckNames(entries);

  const duplicates = [
    ...new Set(names.filter((n, i) => names.indexOf(n) !== i)),
  ];
  if (duplicates.length > 0) {
    problems.push(`duplicate check names: ${duplicates.join(", ")}`);
  }

  if (names.length !== EXPECTED_DRY_RUN_CHECK_COUNT) {
    problems.push(
      `declared ${names.length} checks but the contract requires exactly ${EXPECTED_DRY_RUN_CHECK_COUNT}`,
    );
  } else {
    const diff = firstDiff(names, PUBLICATION_DRY_RUN_CHECKS);
    if (diff >= 0) {
      problems.push(
        `check sequence deviates from the canonical contract at position ${diff}: got "${names[diff]}" but require "${PUBLICATION_DRY_RUN_CHECKS[diff]}"`,
      );
    }
  }

  const failedStatuses = entries.filter(
    (entry) => (entry as DryRunCheckRecord)?.status !== "pass",
  );
  if (failedStatuses.length > 0) {
    const sample = failedStatuses
      .slice(0, 5)
      .map(
        (entry) =>
          `${(entry as DryRunCheckRecord).check}=${JSON.stringify((entry as DryRunCheckRecord).status)}`,
      );
    problems.push(
      `${failedStatuses.length} non-passing status(es): ${sample.join("; ")}`,
    );
  }

  return { ok: problems.length === 0, problems };
}

/** Exact-array equality of plan.publishOrder against PUBLISH_ORDER. */
export function validateExactPublishOrder(value: unknown): ContractValidation {
  const canonical = [...PUBLISH_ORDER] as string[];
  if (!Array.isArray(value) || value.some((n) => typeof n !== "string")) {
    return {
      ok: false,
      problems: ["plan.publishOrder is not an array of strings"],
    };
  }
  const plan = value as string[];
  const diff = firstDiff(plan, canonical);
  if (plan.length !== canonical.length || diff >= 0) {
    return {
      ok: false,
      problems: [
        diff >= 0
          ? `publish order differs from dependency-first PUBLISH_ORDER at position ${diff}: got "${plan[diff]}" but require "${canonical[diff]}"`
          : `publish order length ${plan.length} != PUBLISH_ORDER length ${canonical.length}`,
      ],
    };
  }
  return { ok: true, problems: [] };
}
