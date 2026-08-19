/**
 * The grading contract: evidence packet, JSON schema, retry, and isolation.
 *
 * The Grader is a separate Copilot session that cannot see the skill plugin
 * or the knowledge base; it reads the evidence packet with the view tool and
 * must return one JSON object. This module owns that contract end to end so
 * the runner only applies mechanical constraints to the resulting grade.
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

import {
  type CopilotRunConfiguration,
  type EvalRunResult,
  runGradingSession,
} from "./copilot-run.js";
import { addMetrics, emptyMetrics, type RunMetrics } from "./metrics.js";
import { type EvalCase, parseJson } from "./schema.js";

const assertionGradeSchema = z.object({
  assertion: z.string().min(1),
  evidence: z.string().min(1),
  passed: z.boolean(),
});

const rubricGradeSchema = z.object({
  criterion: z.string().min(1),
  evidence: z.string().min(1),
  score: z.number().min(0).max(2).nullable(),
});

const gatesSchema = z.record(z.string(), z.boolean());

const variantGradeSchema = z.object({
  assertions: z.array(assertionGradeSchema),
  gates: gatesSchema,
  pass: z.boolean(),
  rubric: z.array(rubricGradeSchema).min(1),
  summary: z.string().min(1),
});

const comparisonSchema = z.object({
  material_differences: z.array(z.string()),
  regressions: z.array(z.string()),
  winner: z.enum(["baseline", "current", "tie"]),
});

const gradeSchema = z.object({
  baseline: variantGradeSchema.optional(),
  comparison: comparisonSchema.optional(),
  current: variantGradeSchema,
  eval_name: z.string().min(1),
});

export type Grade = z.infer<typeof gradeSchema>;

export type GradingOutcome = Readonly<{
  grade: Grade;
  gradingError: null | string;
  metrics: RunMetrics;
}>;

export type GradingRequest = Readonly<{
  baseline?: EvalRunResult;
  baselineLabel: string;
  current: EvalRunResult;
  environment: NodeJS.ProcessEnv;
  evalCase: EvalCase;
  evalDirectory: string;
  instructions: string;
  requireComparison: boolean;
  rubric: string;
}>;

export type VariantGrade = z.infer<typeof variantGradeSchema>;

/**
 * The grader must not see the skill plugin or the knowledge base: it reads
 * the evidence packet with the view tool only. This is the one place that
 * encodes the isolation invariant.
 */
const viewOnlySession = (
  config: CopilotRunConfiguration,
): CopilotRunConfiguration => ({
  ...config,
  availableTools: ["view"],
  knowledgeBase: undefined,
  pluginDirectory: undefined,
});

const cleanJsonResponse = (response: string): string =>
  response
    .replace(/^\s*```json\s*$/gm, "")
    .replace(/^\s*```\s*$/gm, "")
    .trim();

const assertionNames = (
  assertions: VariantGrade["assertions"],
): readonly string[] =>
  [...assertions.map(({ assertion }) => assertion)].sort();

/**
 * Validates grader output against the grade schema. Returns undefined for
 * any contract violation (bad JSON, wrong eval, wrong assertion set, missing
 * baseline) so the caller can retry with a fresh attempt.
 */
export const normalizeGradeResponse = (
  response: string,
  evalCase: EvalCase,
  requireComparison: boolean,
): Grade | undefined => {
  try {
    const parsed = gradeSchema.safeParse(
      parseJson(cleanJsonResponse(response), "grader response"),
    );
    if (!parsed.success || parsed.data.eval_name !== evalCase.name) {
      return undefined;
    }

    const expected = [...evalCase.assertions].sort();
    const currentMatches =
      JSON.stringify(assertionNames(parsed.data.current.assertions)) ===
      JSON.stringify(expected);
    if (!currentMatches) {
      return undefined;
    }
    if (!requireComparison) {
      return {
        current: parsed.data.current,
        eval_name: parsed.data.eval_name,
      };
    }
    if (!parsed.data.baseline || !parsed.data.comparison) {
      return undefined;
    }
    return JSON.stringify(assertionNames(parsed.data.baseline.assertions)) ===
      JSON.stringify(expected)
      ? parsed.data
      : undefined;
  } catch {
    return undefined;
  }
};

const failedGrade = (
  evalCase: EvalCase,
  message: string,
  requireComparison: boolean,
): Grade => {
  const variant = {
    assertions: [],
    gates: {},
    pass: false,
    rubric: [
      {
        criterion: "Automated grading",
        evidence: message,
        score: 0,
      },
    ],
    summary: message,
  };

  return {
    ...(requireComparison
      ? {
          baseline: variant,
          comparison: {
            material_differences: [],
            regressions: [],
            winner: "tie",
          } satisfies NonNullable<Grade["comparison"]>,
        }
      : {}),
    current: variant,
    eval_name: evalCase.name,
  };
};

const buildGradingPacket = (
  instructions: string,
  rubric: string,
  evalCase: EvalCase,
  baselineLabel: string,
  current: EvalRunResult,
  baseline: EvalRunResult | undefined,
): string => {
  const compared = baseline !== undefined;
  return [
    `<grader-instructions>\n${instructions}\n</grader-instructions>`,
    compared
      ? undefined
      : "<comparison-mode>\nThis run has no baseline. Return only `eval_name` and `current`. Do not include `baseline` or `comparison`.\n</comparison-mode>",
    `<grade-input>\n${JSON.stringify(
      {
        assertions: evalCase.assertions,
        baseline: compared ? baselineLabel : null,
        eval_name: evalCase.name,
        expected_output: evalCase.expected_output,
        follow_up: evalCase.follow_up ?? null,
        prompt: evalCase.prompt,
      },
      null,
      2,
    )}\n</grade-input>`,
    `<rubric>\n${rubric}\n</rubric>`,
    `<current-evidence>\n${current.evidence}\n</current-evidence>`,
    compared
      ? `<baseline-evidence>\n${baseline.evidence}\n</baseline-evidence>`
      : undefined,
  ]
    .filter((section): section is string => section !== undefined)
    .join("\n\n");
};

/**
 * Grades one eval, retrying once when the grader returns invalid output.
 * Falls back to a synthetic failing grade so one bad grader run cannot abort
 * the suite.
 */
export const gradeEval = async (
  config: CopilotRunConfiguration,
  request: GradingRequest,
): Promise<GradingOutcome> => {
  const packet = buildGradingPacket(
    request.instructions,
    request.rubric,
    request.evalCase,
    request.baselineLabel,
    request.current,
    request.baseline,
  );
  const packetPath = join(request.evalDirectory, "grading-packet.md");
  await writeFile(packetPath, packet);
  // Inline packets stay under Copilot's practical prompt budget. Larger ones
  // are written to disk so the grader reads them with the view tool.
  const prompt =
    Buffer.byteLength(packet) <= 180_000
      ? `Do not call tools. Grade the complete packet below and return only the required JSON.\n\n${packet}`
      : "Read grading-packet.md, follow its instructions, and return only the required JSON.";
  const session = viewOnlySession(config);
  let metrics = emptyMetrics();

  for (const attempt of [1, 2]) {
    const attemptPrompt =
      attempt === 1
        ? prompt
        : `The previous answer was invalid. Return only one JSON object matching the grader instructions exactly.\n\n${prompt}`;
    const result = await runGradingSession(
      session,
      attemptPrompt,
      request.evalDirectory,
      attempt,
      request.environment,
    );
    metrics = addMetrics(metrics, result.metrics);
    const grade = result.error
      ? undefined
      : normalizeGradeResponse(
          result.output,
          request.evalCase,
          request.requireComparison,
        );
    await writeFile(
      join(result.artifactDirectory, "response.txt"),
      result.output,
    );

    if (grade) {
      return { grade, gradingError: null, metrics };
    }
  }

  const message = "The automated grader did not return valid JSON.";
  return {
    grade: failedGrade(request.evalCase, message, request.requireComparison),
    gradingError: message,
    metrics,
  };
};
