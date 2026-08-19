/**
 * Orchestrates the suite: hooks, Copilot variants, grading, and reports.
 *
 * Mechanical failures override the LLM grade. Current must load and invoke
 * the skill; baseline may pass without it so a missing previous commit still
 * produces a comparison. current-only skips the baseline session. after_all
 * runs in finally so cleanup always happens.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  type CopilotRunConfiguration,
  type EvalRunResult,
  runEvalVariant,
} from "./copilot-run.js";
import { formatEvalOutcome } from "./format.js";
import { type Grade, gradeEval, type VariantGrade } from "./grader.js";
import { runSkillHook } from "./hooks.js";
import {
  addMetrics,
  emptyMetrics,
  formatUsage,
  type RunMetrics,
  totalMetrics,
} from "./metrics.js";
import { runCommand } from "./process.js";
import { createElapsedTimer, silentProgress } from "./progress.js";
import { type BaselinePlan, type RuntimeConfiguration } from "./runtime.js";
import {
  type EvalCase,
  type EvalVariant,
  type SkillEvalManifest,
} from "./schema.js";

export type SuiteResult = Readonly<{
  reportPath: string;
  success: boolean;
}>;
type EvalRow = Readonly<{
  baseline?: VariantRow;
  comparison?: Grade["comparison"];
  current: VariantRow;
  eval_name: string;
  grader_metrics: RunMetrics;
  grading_error: null | string;
}>;

type VariantRow = Readonly<{
  assertions: VariantGrade["assertions"];
  metrics: RunMetrics;
  pass: boolean;
  summary: string;
}>;

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
      : runtime.baseline.kind === "plugin"
        ? runtime.baseline.directory
        : undefined,
  progress: runtime.progress,
  promptPrefix: `${manifest.runner.prompt_prefix}\n\n`,
  reasoningEffort: runtime.reasoningEffort,
  skillDirectory: runtime.skillDirectory,
  skillName: manifest.skill_name,
  variant,
});

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

const writeReport = async (
  outputDirectory: string,
  baseline: BaselinePlan,
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

  const currentTotals = totalMetrics(rows.map((row) => row.current.metrics));
  const baselineTotals = totalMetrics(
    rows.flatMap((row) => (row.baseline ? [row.baseline.metrics] : [])),
  );
  const graderTotals = totalMetrics(rows.map((row) => row.grader_metrics));
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
      baseline_ai_credits: baselineTotals.aiCredits,
      baseline_duration_ms: baselineTotals.durationMs,
      baseline_input_tokens: baselineTotals.inputTokens,
      baseline_output_tokens: baselineTotals.outputTokens,
      baseline_passes: rows.filter((row) => row.baseline?.pass).length,
      current_ai_credits: currentTotals.aiCredits,
      current_duration_ms: currentTotals.durationMs,
      current_input_tokens: currentTotals.inputTokens,
      current_output_tokens: currentTotals.outputTokens,
      current_passes: rows.filter((row) => row.current.pass).length,
      eval_count: rows.length,
      grader_input_tokens: graderTotals.inputTokens,
      grader_output_tokens: graderTotals.outputTokens,
      grading_errors: rows.filter((row) => row.grading_error !== null).length,
    },
  };
  const summaryJson = join(outputDirectory, "summary.json");
  await writeFile(summaryJson, `${JSON.stringify(summary, null, 2)}\n`);

  const compared = baseline.kind !== "none";
  const lines = [
    "# Skill Eval Report",
    "",
    compared ? `Baseline: \`${baseline.label}\`` : "Comparison: current-only",
    "",
    "| Eval | Current | Baseline | Winner | Current tokens | Baseline tokens |",
    "| --- | --- | --- | --- | ---: | ---: |",
    ...rows.map((row) => {
      const currentTokens =
        row.current.metrics.inputTokens + row.current.metrics.outputTokens;
      if (!row.baseline || !row.comparison) {
        return `| ${row.eval_name} | ${
          row.current.pass ? "pass" : "fail"
        } | n/a | n/a | ${currentTokens} | n/a |`;
      }
      return `| ${row.eval_name} | ${row.current.pass ? "pass" : "fail"} | ${
        row.baseline.pass ? "pass" : "fail"
      } | ${row.comparison.winner} | ${currentTokens} | ${
        row.baseline.metrics.inputTokens + row.baseline.metrics.outputTokens
      } |`;
    }),
    "",
    "## Totals",
    "",
    `- Current: ${summary.totals.current_passes}/${summary.totals.eval_count} passed, ${
      summary.totals.current_input_tokens + summary.totals.current_output_tokens
    } tokens, ${summary.totals.current_duration_ms} ms model time, ${
      summary.totals.current_ai_credits
    } AI credits.`,
    ...(compared
      ? [
          `- Baseline: ${summary.totals.baseline_passes}/${summary.totals.eval_count} passed, ${
            summary.totals.baseline_input_tokens +
            summary.totals.baseline_output_tokens
          } tokens, ${summary.totals.baseline_duration_ms} ms model time, ${
            summary.totals.baseline_ai_credits
          } AI credits.`,
        ]
      : []),
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

const toVariantRow = (
  grade: VariantGrade,
  metrics: RunMetrics,
): VariantRow => ({
  assertions: grade.assertions,
  metrics,
  pass: grade.pass,
  summary: grade.summary,
});

const constrainGrade = (
  grade: Grade,
  current: EvalRunResult,
  baseline: EvalRunResult | undefined,
): Grade => ({
  ...grade,
  current: constrainVariant(grade.current, current, true),
  ...(baseline && grade.baseline
    ? {
        baseline: constrainVariant(grade.baseline, baseline, false),
      }
    : { baseline: undefined, comparison: undefined }),
});

type SuiteEvalRequest = Readonly<{
  baselineConfig?: CopilotRunConfiguration;
  compared: boolean;
  currentConfig: CopilotRunConfiguration;
  elapsed: () => string;
  environment: NodeJS.ProcessEnv;
  evalCase: EvalCase;
  index: number;
  instructions: string;
  rubric: string;
  runtime: RuntimeConfiguration;
  suiteUsage: RunMetrics;
  total: number;
}>;

const evaluateCase = async (
  request: SuiteEvalRequest,
): Promise<Readonly<{ row: EvalRow; usage: RunMetrics }>> => {
  const progress = request.runtime.progress ?? silentProgress;
  const evalProgress = progress.forEval(request.evalCase.name);
  const currentProgress = progress.forEval(
    request.evalCase.name,
    request.runtime.currentLabel,
  );
  const currentScoped = { ...request.currentConfig, progress: currentProgress };
  evalProgress.info("Running {eval} ({index}/{total})", {
    eval: request.evalCase.name,
    index: request.index,
    total: request.total,
  });
  const current = await runEvalVariant(
    currentScoped,
    request.evalCase,
    request.environment,
  );
  currentProgress.debug("Finished {eval} current: {usage}", {
    eval: request.evalCase.name,
    usage: formatUsage(current.metrics),
  });
  const baseline = request.baselineConfig
    ? await runEvalVariant(
        {
          ...request.baselineConfig,
          progress: progress.forEval(
            request.evalCase.name,
            request.runtime.baseline.label,
          ),
        },
        request.evalCase,
        request.environment,
      )
    : undefined;
  if (baseline) {
    progress
      .forEval(request.evalCase.name, request.runtime.baseline.label)
      .debug("Finished {eval} baseline: {usage}", {
        eval: request.evalCase.name,
        usage: formatUsage(baseline.metrics),
      });
  }
  const evalDirectory = join(
    request.runtime.outputDirectory,
    request.evalCase.name,
  );
  const graded = await gradeEval(currentScoped, {
    baseline,
    baselineLabel: request.runtime.baseline.label,
    current,
    environment: request.environment,
    evalCase: request.evalCase,
    evalDirectory,
    instructions: request.instructions,
    requireComparison: request.compared,
    rubric: request.rubric,
  });
  evalProgress.debug("Finished {eval} grader: {usage}", {
    eval: request.evalCase.name,
    usage: formatUsage(graded.metrics),
  });
  const grade = constrainGrade(graded.grade, current, baseline);
  await writeFile(
    join(evalDirectory, "grade.json"),
    `${JSON.stringify(grade, null, 2)}\n`,
  );
  const usage = addMetrics(
    addMetrics(request.suiteUsage, current.metrics),
    baseline ? addMetrics(baseline.metrics, graded.metrics) : graded.metrics,
  );
  evalProgress.debug(
    request.compared
      ? "Eval {eval} current={current} baseline={baseline} winner={winner} · suite {usage} · wall {elapsed}"
      : "Eval {eval} current={current} · suite {usage} · wall {elapsed}",
    {
      ...(request.compared
        ? {
            baseline: formatEvalOutcome(
              grade.baseline?.pass ?? false,
              request.runtime.baseline.label,
            ),
            winner: grade.comparison?.winner ?? "n/a",
          }
        : {}),
      current: formatEvalOutcome(
        grade.current.pass,
        request.runtime.currentLabel,
      ),
      elapsed: request.elapsed(),
      eval: request.evalCase.name,
      usage: formatUsage(usage),
    },
  );
  return {
    row: {
      baseline:
        baseline && grade.baseline
          ? toVariantRow(grade.baseline, baseline.metrics)
          : undefined,
      comparison: grade.comparison,
      current: toVariantRow(grade.current, current.metrics),
      eval_name: request.evalCase.name,
      grader_metrics: graded.metrics,
      grading_error: graded.gradingError,
    },
    usage,
  };
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
  const compared = runtime.baseline.kind !== "none";
  const currentConfig = createRunConfiguration(manifest, runtime, "current");
  const baselineConfig = compared
    ? createRunConfiguration(manifest, runtime, "baseline")
    : undefined;
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
      const evaluated = await evaluateCase({
        baselineConfig,
        compared,
        currentConfig,
        elapsed,
        environment,
        evalCase,
        index: index + 1,
        instructions,
        rubric,
        runtime,
        suiteUsage,
        total: evals.length,
      });
      rows.push(evaluated.row);
      suiteUsage = evaluated.usage;
    }

    const reportPath = await writeReport(
      runtime.outputDirectory,
      runtime.baseline,
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
