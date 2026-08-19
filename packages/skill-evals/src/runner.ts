/**
 * Orchestrates the suite: hooks, both Copilot variants, grading, and reports.
 *
 * Mechanical failures override the LLM grade. Current must load and invoke
 * the skill; baseline may pass without it so a missing previous commit still
 * produces a comparison. after_all runs in finally so cleanup always happens.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

import {
  type CopilotRunConfiguration,
  type EvalRunResult,
  runEvalVariant,
  runGrader,
  type RunMetrics,
} from "./copilot-run.js";
import { formatEvalOutcome } from "./format.js";
import { runSkillHook } from "./hooks.js";
import { runCommand } from "./process.js";
import { createElapsedTimer, formatUsage, silentProgress } from "./progress.js";
import { type RuntimeConfiguration } from "./runtime.js";
import {
  type EvalCase,
  type EvalVariant,
  parseJson,
  type SkillEvalManifest,
} from "./schema.js";

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

const gradeSchema = z.object({
  baseline: variantGradeSchema,
  comparison: z.object({
    material_differences: z.array(z.string()),
    regressions: z.array(z.string()),
    winner: z.enum(["baseline", "current", "tie"]),
  }),
  current: variantGradeSchema,
  eval_name: z.string().min(1),
});

export type SuiteResult = Readonly<{
  reportPath: string;
  success: boolean;
}>;
type EvalRow = Readonly<{
  baseline: Readonly<{
    assertions: VariantGrade["assertions"];
    metrics: RunMetrics;
    pass: boolean;
    summary: string;
  }>;
  comparison: Grade["comparison"];
  current: Readonly<{
    assertions: VariantGrade["assertions"];
    metrics: RunMetrics;
    pass: boolean;
    summary: string;
  }>;
  eval_name: string;
  grader_metrics: RunMetrics;
  grading_error: null | string;
}>;

type Grade = z.infer<typeof gradeSchema>;

type VariantGrade = z.infer<typeof variantGradeSchema>;

const addMetrics = (left: RunMetrics, right: RunMetrics): RunMetrics => ({
  aiCredits: left.aiCredits + right.aiCredits,
  durationMs: left.durationMs + right.durationMs,
  inputTokens: left.inputTokens + right.inputTokens,
  models: [...new Set([...left.models, ...right.models])],
  outputTokens: left.outputTokens + right.outputTokens,
});

const emptyMetrics = (): RunMetrics => ({
  aiCredits: 0,
  durationMs: 0,
  inputTokens: 0,
  models: [],
  outputTokens: 0,
});

/** Maps a suite variant onto Copilot flags, plugin path, and hook config. */
export const createRunConfiguration = (
  manifest: SkillEvalManifest,
  runtime: RuntimeConfiguration,
  variant: EvalVariant,
): CopilotRunConfiguration => ({
  availableTools: manifest.runner.available_tools,
  copilotBin: runtime.copilotBin,
  disabledMcps: runtime.disabledMcps,
  graderModel: runtime.graderModel,
  hooks: manifest.hooks,
  knowledgeBase: runtime.knowledgeBase,
  knowledgeBaseEnvironmentVariable:
    manifest.runner.knowledge_base?.environment_variable,
  mainModel: runtime.mainModel,
  maxAiCredits: runtime.maxAiCredits,
  outputDirectory: runtime.outputDirectory,
  pluginDirectory:
    variant === "current"
      ? runtime.currentPlugin
      : runtime.baselineLabel === "without-skill"
        ? undefined
        : runtime.baselinePlugin,
  progress: runtime.progress,
  promptPrefix: `${manifest.runner.prompt_prefix}\n\n`,
  reasoningEffort: runtime.reasoningEffort,
  skillDirectory: runtime.skillDirectory,
  skillName: manifest.skill_name,
  variant,
});

const cleanJsonResponse = (response: string): string =>
  response
    .replace(/^\s*```json\s*$/gm, "")
    .replace(/^\s*```\s*$/gm, "")
    .trim();

const normalizeGrade = (
  response: string,
  evalCase: EvalCase,
): Grade | undefined => {
  try {
    const parsed = gradeSchema.safeParse(
      parseJson(cleanJsonResponse(response), "grader response"),
    );
    if (!parsed.success || parsed.data.eval_name !== evalCase.name) {
      return undefined;
    }

    const expected = [...evalCase.assertions].sort();
    const current = parsed.data.current.assertions
      .map(({ assertion }) => assertion)
      .sort();
    const baseline = parsed.data.baseline.assertions
      .map(({ assertion }) => assertion)
      .sort();
    return JSON.stringify(current) === JSON.stringify(expected) &&
      JSON.stringify(baseline) === JSON.stringify(expected)
      ? parsed.data
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * The LLM cannot overrule a failed execution. Current also must invoke the
 * skill; otherwise a lucky unskilled answer would look like a regression win.
 */
const constrainVariant = (
  grade: VariantGrade,
  run: EvalRunResult,
  requireSkill: boolean,
): VariantGrade => {
  const executionPassed =
    run.mechanical.executionSuccess &&
    (!requireSkill ||
      (run.mechanical.skillLoaded && run.mechanical.skillInvoked));
  if (executionPassed) {
    return grade;
  }

  return {
    ...grade,
    pass: false,
    summary: `${grade.summary} Runner constraint failed: execution must succeed${
      requireSkill ? " and invoke the evaluated skill" : ""
    }.`,
  };
};

const failedGrade = (evalCase: EvalCase, message: string): Grade => {
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
    baseline: variant,
    comparison: {
      material_differences: [],
      regressions: [],
      winner: "tie",
    },
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
  baseline: EvalRunResult,
): string =>
  [
    `<grader-instructions>\n${instructions}\n</grader-instructions>`,
    `<grade-input>\n${JSON.stringify(
      {
        assertions: evalCase.assertions,
        baseline: baselineLabel,
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
    `<baseline-evidence>\n${baseline.evidence}\n</baseline-evidence>`,
  ].join("\n\n");

const gradeEval = async (
  config: CopilotRunConfiguration,
  evalCase: EvalCase,
  evalDirectory: string,
  packet: string,
  environment: NodeJS.ProcessEnv,
): Promise<
  Readonly<{ grade: Grade; gradingError: null | string; metrics: RunMetrics }>
> => {
  const packetPath = join(evalDirectory, "grading-packet.md");
  await writeFile(packetPath, packet);
  // Inline packets stay under Copilot's practical prompt budget. Larger ones
  // are written to disk so the grader reads them with the view tool.
  const prompt =
    Buffer.byteLength(packet) <= 180_000
      ? `Do not call tools. Grade the complete packet below and return only the required JSON.\n\n${packet}`
      : "Read grading-packet.md, follow its instructions, and return only the required JSON.";
  let metrics = emptyMetrics();

  for (const attempt of [1, 2]) {
    const attemptPrompt =
      attempt === 1
        ? prompt
        : `The previous answer was invalid. Return only one JSON object matching the grader instructions exactly.\n\n${prompt}`;
    const result = await runGrader(
      config,
      attemptPrompt,
      evalDirectory,
      attempt,
      environment,
    );
    metrics = addMetrics(metrics, result.metrics);
    const grade = result.error
      ? undefined
      : normalizeGrade(result.output, evalCase);
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
    grade: failedGrade(evalCase, message),
    gradingError: message,
    metrics,
  };
};

const writeReport = async (
  outputDirectory: string,
  baselineLabel: string,
  rows: readonly EvalRow[],
  guardrailPattern?: string,
): Promise<string> => {
  const failedGuardrails = new Map<string, number>();
  const guardrailExpression = guardrailPattern
    ? new RegExp(guardrailPattern, "g")
    : undefined;
  for (const row of rows) {
    for (const assertion of row.current.assertions) {
      if (!assertion.passed && guardrailExpression) {
        for (const guardrail of assertion.assertion.match(
          guardrailExpression,
        ) ?? []) {
          failedGuardrails.set(
            guardrail,
            (failedGuardrails.get(guardrail) ?? 0) + 1,
          );
        }
      }
    }
  }

  const sum = (selector: (row: EvalRow) => number): number =>
    rows.reduce((total, row) => total + selector(row), 0);
  const summary = {
    evals: rows,
    failed_guardrails: [...failedGuardrails]
      .map(([guardrail, failures]) => ({ failures, guardrail }))
      .sort(
        (left, right) =>
          right.failures - left.failures ||
          left.guardrail.localeCompare(right.guardrail),
      ),
    totals: {
      baseline_ai_credits: sum((row) => row.baseline.metrics.aiCredits),
      baseline_duration_ms: sum((row) => row.baseline.metrics.durationMs),
      baseline_input_tokens: sum((row) => row.baseline.metrics.inputTokens),
      baseline_output_tokens: sum((row) => row.baseline.metrics.outputTokens),
      baseline_passes: rows.filter((row) => row.baseline.pass).length,
      current_ai_credits: sum((row) => row.current.metrics.aiCredits),
      current_duration_ms: sum((row) => row.current.metrics.durationMs),
      current_input_tokens: sum((row) => row.current.metrics.inputTokens),
      current_output_tokens: sum((row) => row.current.metrics.outputTokens),
      current_passes: rows.filter((row) => row.current.pass).length,
      eval_count: rows.length,
      grader_input_tokens: sum((row) => row.grader_metrics.inputTokens),
      grader_output_tokens: sum((row) => row.grader_metrics.outputTokens),
      grading_errors: rows.filter((row) => row.grading_error !== null).length,
    },
  };
  const summaryJson = join(outputDirectory, "summary.json");
  await writeFile(summaryJson, `${JSON.stringify(summary, null, 2)}\n`);

  const lines = [
    "# Skill Eval Report",
    "",
    `Baseline: \`${baselineLabel}\``,
    "",
    "| Eval | Current | Baseline | Winner | Current tokens | Baseline tokens |",
    "| --- | --- | --- | --- | ---: | ---: |",
    ...rows.map(
      (row) =>
        `| ${row.eval_name} | ${row.current.pass ? "pass" : "fail"} | ${
          row.baseline.pass ? "pass" : "fail"
        } | ${row.comparison.winner} | ${
          row.current.metrics.inputTokens + row.current.metrics.outputTokens
        } | ${
          row.baseline.metrics.inputTokens + row.baseline.metrics.outputTokens
        } |`,
    ),
    "",
    "## Totals",
    "",
    `- Current: ${summary.totals.current_passes}/${summary.totals.eval_count} passed, ${
      summary.totals.current_input_tokens + summary.totals.current_output_tokens
    } tokens, ${summary.totals.current_duration_ms} ms model time, ${
      summary.totals.current_ai_credits
    } AI credits.`,
    `- Baseline: ${summary.totals.baseline_passes}/${summary.totals.eval_count} passed, ${
      summary.totals.baseline_input_tokens +
      summary.totals.baseline_output_tokens
    } tokens, ${summary.totals.baseline_duration_ms} ms model time, ${
      summary.totals.baseline_ai_credits
    } AI credits.`,
    `- Grader: ${
      summary.totals.grader_input_tokens + summary.totals.grader_output_tokens
    } tokens.`,
    `- Grading errors: ${summary.totals.grading_errors}.`,
  ];

  if (summary.failed_guardrails.length > 0) {
    lines.push(
      "",
      "## Recurring Current Failures",
      "",
      ...summary.failed_guardrails.map(
        ({ failures, guardrail }) =>
          `- \`${guardrail}\`: ${failures} failed assertions`,
      ),
    );
  }

  const reportPath = join(outputDirectory, "summary.md");
  await writeFile(reportPath, `${lines.join("\n")}\n`);
  return reportPath;
};

const knowledgeBaseStatus = async (
  knowledgeBase: string | undefined,
): Promise<string | undefined> => {
  if (!knowledgeBase) {
    return undefined;
  }
  const result = await runCommand("git", ["status", "--porcelain=v1"], {
    cwd: knowledgeBase,
  });
  return result.exitCode === 0 ? result.stdout : undefined;
};

/** Runs selected evals, writes summary.json/md, and returns CI success. */
export const runEvaluationSuite = async (
  manifest: SkillEvalManifest,
  runtime: RuntimeConfiguration,
  evals: readonly EvalCase[],
  environment: NodeJS.ProcessEnv,
): Promise<SuiteResult> => {
  const [instructions, rubric, statusBefore] = await Promise.all([
    readFile(
      join(runtime.skillDirectory, manifest.grading.instructions),
      "utf8",
    ),
    readFile(join(runtime.skillDirectory, manifest.grading.rubric), "utf8"),
    knowledgeBaseStatus(runtime.knowledgeBase),
  ]);
  const progress = runtime.progress ?? silentProgress;
  const elapsed = createElapsedTimer();
  const currentConfig = createRunConfiguration(manifest, runtime, "current");
  const baselineConfig = createRunConfiguration(manifest, runtime, "baseline");
  const suiteHookContext = {
    outputDirectory: runtime.outputDirectory,
    skillDirectory: runtime.skillDirectory,
  };
  const rows: EvalRow[] = [];
  let suiteUsage = emptyMetrics();

  try {
    if (manifest.hooks.before_all) {
      progress.debug("Running before_all");
    }
    await runSkillHook(
      manifest.hooks,
      "before_all",
      suiteHookContext,
      environment,
    );

    for (const [index, evalCase] of evals.entries()) {
      const evalProgress = progress.forEval(evalCase.name);
      const currentScoped = { ...currentConfig, progress: evalProgress };
      const baselineScoped = { ...baselineConfig, progress: evalProgress };
      evalProgress.info("Running {eval} ({index}/{total})", {
        eval: evalCase.name,
        index: index + 1,
        total: evals.length,
      });
      const current = await runEvalVariant(
        currentScoped,
        evalCase,
        environment,
      );
      evalProgress.debug("Finished {eval} current: {usage}", {
        eval: evalCase.name,
        usage: formatUsage(current.metrics),
      });
      const baseline = await runEvalVariant(
        baselineScoped,
        evalCase,
        environment,
      );
      evalProgress.debug("Finished {eval} baseline: {usage}", {
        eval: evalCase.name,
        usage: formatUsage(baseline.metrics),
      });
      const evalDirectory = join(runtime.outputDirectory, evalCase.name);
      const graded = await gradeEval(
        currentScoped,
        evalCase,
        evalDirectory,
        buildGradingPacket(
          instructions,
          rubric,
          evalCase,
          runtime.baselineLabel,
          current,
          baseline,
        ),
        environment,
      );
      evalProgress.debug("Finished {eval} grader: {usage}", {
        eval: evalCase.name,
        usage: formatUsage(graded.metrics),
      });
      const grade: Grade = {
        ...graded.grade,
        baseline: constrainVariant(graded.grade.baseline, baseline, false),
        current: constrainVariant(graded.grade.current, current, true),
      };
      await writeFile(
        join(evalDirectory, "grade.json"),
        `${JSON.stringify(grade, null, 2)}\n`,
      );
      rows.push({
        baseline: {
          assertions: grade.baseline.assertions,
          metrics: baseline.metrics,
          pass: grade.baseline.pass,
          summary: grade.baseline.summary,
        },
        comparison: grade.comparison,
        current: {
          assertions: grade.current.assertions,
          metrics: current.metrics,
          pass: grade.current.pass,
          summary: grade.current.summary,
        },
        eval_name: evalCase.name,
        grader_metrics: graded.metrics,
        grading_error: graded.gradingError,
      });
      suiteUsage = addMetrics(
        addMetrics(addMetrics(suiteUsage, current.metrics), baseline.metrics),
        graded.metrics,
      );
      evalProgress.debug(
        "Eval {eval} current={current} baseline={baseline} winner={winner} · suite {usage} · wall {elapsed}",
        {
          baseline: formatEvalOutcome(
            grade.baseline.pass,
            runtime.baselineLabel,
          ),
          current: formatEvalOutcome(grade.current.pass, runtime.currentLabel),
          elapsed: elapsed(),
          eval: evalCase.name,
          usage: formatUsage(suiteUsage),
          winner: grade.comparison.winner,
        },
      );
    }

    const reportPath = await writeReport(
      runtime.outputDirectory,
      runtime.baselineLabel,
      rows,
      manifest.validation.coverage?.pattern,
    );
    const statusAfter = await knowledgeBaseStatus(runtime.knowledgeBase);
    if (statusBefore !== statusAfter) {
      throw new Error("The knowledge base changed during eval execution.");
    }
    progress.debug("Suite complete in {elapsed}: {usage}", {
      elapsed: elapsed(),
      usage: formatUsage(suiteUsage),
    });
    return {
      reportPath,
      success:
        rows.every((row) => row.current.pass) &&
        rows.every((row) => row.grading_error === null),
    };
  } finally {
    // after_all must run even when a later eval or the KB-dirty check fails.
    if (manifest.hooks.after_all) {
      progress.debug("Running after_all");
    }
    await runSkillHook(
      manifest.hooks,
      "after_all",
      suiteHookContext,
      environment,
    );
  }
};
