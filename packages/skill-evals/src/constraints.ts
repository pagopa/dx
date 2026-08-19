/**
 * Failed-constraint summary for a graded variant.
 *
 * The grader owns gates and assertions; hooks add mechanical booleans; the
 * runner can still force a fail when execution or skill invocation breaks.
 * This module only explains a failing variant — a pass never lists leftovers.
 */
import { type MechanicalChecks } from "./copilot-run.js";
import { type VariantGrade } from "./grader.js";

export const constraintSourceSchema = ["grader", "hook", "runner"] as const;

export type ConstraintCollectionOptions = Readonly<{
  gradingError?: string;
  requireSkill: boolean;
}>;

export type ConstraintSource = (typeof constraintSourceSchema)[number];

export type FailedConstraint = Readonly<{
  name: string;
  reason?: string;
  source: ConstraintSource;
}>;

const runnerMechanicalKeys = new Set([
  "addedPlaceholders",
  "diffCheck",
  "executionSuccess",
  "skillInvoked",
  "skillLoaded",
]);

const runnerFailures = (
  mechanical: MechanicalChecks,
  requireSkill: boolean,
): readonly FailedConstraint[] => [
  ...(!mechanical.executionSuccess
    ? [
        {
          name: "executionSuccess",
          reason: "Copilot exited unsuccessfully",
          source: "runner" as const,
        },
      ]
    : []),
  ...(requireSkill && !mechanical.skillLoaded
    ? [
        {
          name: "skillLoaded",
          reason: "evaluated skill was not loaded",
          source: "runner" as const,
        },
      ]
    : []),
  ...(requireSkill && !mechanical.skillInvoked
    ? [
        {
          name: "skillInvoked",
          reason: "evaluated skill was not invoked",
          source: "runner" as const,
        },
      ]
    : []),
];

const hookFailures = (
  mechanical: MechanicalChecks,
): readonly FailedConstraint[] =>
  Object.keys(mechanical)
    .sort()
    .flatMap((name) =>
      runnerMechanicalKeys.has(name) || mechanical[name] !== false
        ? []
        : [{ name, source: "hook" as const }],
    );

const graderFailures = (
  grade: VariantGrade,
  gradingError?: string,
): readonly FailedConstraint[] => [
  ...(gradingError
    ? [{ name: "validGrade", reason: gradingError, source: "grader" as const }]
    : []),
  ...Object.entries(grade.gates).flatMap(([name, passed]) =>
    passed ? [] : [{ name, source: "grader" as const }],
  ),
  ...grade.assertions.flatMap((assertion) =>
    assertion.passed
      ? []
      : [
          {
            name: assertion.assertion,
            reason: assertion.evidence,
            source: "grader" as const,
          },
        ],
  ),
];

/** Lists the checks that explain why a variant failed. */
export const collectFailedConstraints = (
  grade: VariantGrade,
  mechanical: MechanicalChecks,
  options: ConstraintCollectionOptions,
): readonly FailedConstraint[] => {
  if (grade.pass) {
    return [];
  }

  const failed = [
    ...runnerFailures(mechanical, options.requireSkill),
    ...hookFailures(mechanical),
    ...graderFailures(grade, options.gradingError),
  ];

  return failed.length > 0
    ? failed
    : [{ name: "pass", reason: grade.summary, source: "grader" }];
};

/** One constraint as `name (source): reason` for logs and reports. */
export const formatFailedConstraint = (
  constraint: FailedConstraint,
): string => {
  const label = `${constraint.name} (${constraint.source})`;
  return constraint.reason ? `${label}: ${constraint.reason}` : label;
};

/** Joins failed constraints into a single verbose summary clause. */
export const formatFailedConstraints = (
  constraints: readonly FailedConstraint[],
): string => constraints.map(formatFailedConstraint).join("; ");

/** Markdown bullet body for one failed constraint. */
export const formatFailedConstraintMarkdown = (
  failed: FailedConstraint,
): string => {
  const label = `\`${failed.name}\` (${failed.source})`;
  return failed.reason ? `${label}: ${failed.reason}` : label;
};
