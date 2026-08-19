#!/usr/bin/env node
/**
 * Entrypoint for validate, scaffold, and non-interactive eval.
 *
 * This is the only module that may read process.env. Copilot, models, and
 * credit limits are CLI flags so the rest of the package stays testable.
 */
import { Command, Option } from "commander";
import { mkdir, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { z } from "zod";

import { resolveComparison } from "./comparison.js";
import { prepareEvalWorkspace } from "./copilot-run.js";
import { runSkillHook } from "./hooks.js";
import {
  configureLogging,
  getPackageLogger,
  toProgressSink,
} from "./logging.js";
import { loadManifest, validateManifest } from "./manifest.js";
import { runCommand } from "./process.js";
import { createElapsedTimer, createProgress } from "./progress.js";
import { createRunConfiguration, runEvaluationSuite } from "./runner.js";
import {
  createTemporaryOutput,
  prepareRuntime,
  type RuntimeConfiguration,
} from "./runtime.js";
import { scaffoldEval } from "./scaffold.js";
import { type ReasoningEffort, reasoningEffortSchema } from "./schema.js";
import { parseCliVerbosity, type Verbosity } from "./verbosity.js";

type EvalOptions = Readonly<{
  baselineRef?: string;
  copilotBin: string;
  currentOnly: boolean;
  dryRun: boolean;
  eval: readonly string[];
  graderModel: string;
  mainModel: string;
  maxAiCredits: number;
  noBaseline: boolean;
  output?: string;
  reasoningEffort: ReasoningEffort;
  verbosity: Verbosity;
}> &
  SharedOptions;

const maxAiCreditsSchema = z.coerce.number().int().positive();

type SharedOptions = Readonly<{
  skill: string;
}>;

/**
 * Prefer the repo root so `--skill plugins/...` works from any subdirectory.
 * Outside a Git checkout we fall back to cwd.
 */
const resolveInvocationDirectory = async (): Promise<string> => {
  const result = await runCommand("git", ["rev-parse", "--show-toplevel"], {
    cwd: process.cwd(),
  });
  return result.exitCode === 0 ? result.stdout.trim() : process.cwd();
};

const resolveSkillDirectory = async (
  invocationDirectory: string,
  skill: string,
): Promise<string> => realpath(resolve(invocationDirectory, skill));

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
};

const prepareOutputDirectory = async (
  invocationDirectory: string,
  requested: string | undefined,
  skillName: string,
): Promise<string> => {
  if (!requested) {
    return createTemporaryOutput(skillName);
  }

  const output = resolve(invocationDirectory, requested);
  if (await pathExists(output)) {
    if ((await readdir(output)).length > 0) {
      throw new Error(`Output directory must be empty: ${output}`);
    }
  } else {
    await mkdir(output, { recursive: true });
  }
  return realpath(output);
};

const writeMetadata = async (
  runtime: RuntimeConfiguration,
  evals: readonly string[],
): Promise<void> => {
  await writeFile(
    join(runtime.outputDirectory, "metadata.json"),
    `${JSON.stringify(
      {
        baseline: runtime.baseline.label,
        comparison: runtime.comparison,
        createdAt: new Date().toISOString(),
        current: runtime.currentLabel,
        evals,
        graderModel: runtime.graderModel,
        knowledgeBase: runtime.knowledgeBase ?? null,
        model: runtime.mainModel,
        reasoningEffort: runtime.reasoningEffort,
      },
      null,
      2,
    )}\n`,
  );
};

const runEval = async (options: EvalOptions): Promise<void> => {
  await configureLogging(options.verbosity >= 1);
  const progress = createProgress(
    toProgressSink(getPackageLogger(["eval"])),
    options.verbosity,
  );
  const elapsed = createElapsedTimer();
  const invocationDirectory = await resolveInvocationDirectory();
  const skillDirectory = await resolveSkillDirectory(
    invocationDirectory,
    options.skill,
  );
  progress.debug("Validating skill at {skill}", { skill: skillDirectory });
  await validateManifest(skillDirectory, true);
  const manifest = await loadManifest(skillDirectory);
  const unknown = options.eval.filter(
    (name) => !manifest.evals.some((evalCase) => evalCase.name === name),
  );
  if (unknown.length > 0) {
    throw new Error(`Unknown evals: ${unknown.join(", ")}`);
  }

  const outputDirectory = await prepareOutputDirectory(
    invocationDirectory,
    options.output,
    manifest.skill_name,
  );
  const selectedEvals =
    options.eval.length > 0
      ? manifest.evals.filter((evalCase) =>
          options.eval.includes(evalCase.name),
        )
      : manifest.evals;
  const comparison = resolveComparison({
    baselineRef: options.baselineRef,
    currentOnly: options.currentOnly,
    manifest: manifest.runner.comparison,
    noBaseline: options.noBaseline,
  });
  progress.debug("Preparing runtime in {output}", { output: outputDirectory });
  const runtime = await prepareRuntime(
    { ...manifest, evals: selectedEvals },
    {
      baselineRef: comparison.baselineRef,
      comparison: comparison.mode,
      copilotBin: options.copilotBin,
      graderModel: options.graderModel,
      invocationDirectory,
      knowledgeBaseEnvironmentPath: manifest.runner.knowledge_base
        ? process.env[manifest.runner.knowledge_base.environment_variable]
        : undefined,
      mainModel: options.mainModel,
      maxAiCredits: options.maxAiCredits,
      outputDirectory,
      progress,
      reasoningEffort: options.reasoningEffort,
      skillDirectory,
    },
  );
  progress.debug(
    "Run parameters: skill={skill} evals={evals} model={model} grader={grader} effort={effort} maxCredits={maxCredits} comparison={comparison} current={current} baseline={baseline} knowledgeBase={knowledgeBase} copilot={copilot}",
    {
      baseline: runtime.baseline.label,
      comparison: runtime.comparison,
      copilot: runtime.copilotBin,
      current: runtime.currentLabel,
      effort: runtime.reasoningEffort,
      evals: selectedEvals.map(({ name }) => name).join(", "),
      grader: runtime.graderModel,
      knowledgeBase: runtime.knowledgeBase ?? "none",
      maxCredits: runtime.maxAiCredits,
      model: runtime.mainModel,
      skill: manifest.skill_name,
    },
  );
  await writeMetadata(
    runtime,
    selectedEvals.map(({ name }) => name),
  );

  if (options.dryRun) {
    const current = createRunConfiguration(manifest, runtime, "current");
    const baseline =
      runtime.baseline.kind === "none"
        ? undefined
        : createRunConfiguration(manifest, runtime, "baseline");
    await runSkillHook(
      manifest.hooks,
      "before_all",
      {
        outputDirectory,
        skillDirectory,
      },
      process.env,
    );
    for (const evalCase of selectedEvals) {
      const workspaces = [
        prepareEvalWorkspace(
          {
            ...current,
            progress: progress.forEval(evalCase.name, runtime.currentLabel),
          },
          evalCase,
          join(outputDirectory, evalCase.name, "current", "workspace"),
          process.env,
        ),
      ];
      if (baseline) {
        workspaces.push(
          prepareEvalWorkspace(
            {
              ...baseline,
              progress: progress.forEval(evalCase.name, runtime.baseline.label),
            },
            evalCase,
            join(outputDirectory, evalCase.name, "baseline", "workspace"),
            process.env,
          ),
        );
      }
      await Promise.all(workspaces);
    }
    progress.info("Prepared {count} evals at {output} in {elapsed}", {
      count: selectedEvals.length,
      elapsed: elapsed(),
      output: outputDirectory,
    });
    return;
  }

  const result = await runEvaluationSuite(
    manifest,
    runtime,
    selectedEvals,
    process.env,
  );
  progress.info("Eval report: {report} ({elapsed})", {
    elapsed: elapsed(),
    report: result.reportPath,
  });
  if (!result.success) {
    process.exitCode = 1;
  }
};

const program = new Command()
  .name("skill-evals")
  .description("Run portable Agent Skill evaluations.");

program
  .command("validate")
  .requiredOption("--skill <directory>", "Skill directory")
  .option("--strict-files", "Require fixtures for context-dependent evals")
  .action(
    async (options: Readonly<{ strictFiles?: boolean }> & SharedOptions) => {
      const invocationDirectory = await resolveInvocationDirectory();
      const skillDirectory = await resolveSkillDirectory(
        invocationDirectory,
        options.skill,
      );
      const result = await validateManifest(
        skillDirectory,
        options.strictFiles ?? false,
      );
      for (const warning of result.warnings) {
        console.warn(`Warning: ${warning}`);
      }
      console.log(
        `Validated ${result.evalCount} evals covering ${result.guardrailCount} guardrails.`,
      );
    },
  );

program
  .command("scaffold")
  .requiredOption("--skill <directory>", "Skill directory")
  .requiredOption("--eval <name>", "Eval name")
  .requiredOption("--output <directory>", "Empty destination directory")
  .action(
    async (
      options: Readonly<{ eval: string; output: string }> & SharedOptions,
    ) => {
      const invocationDirectory = await resolveInvocationDirectory();
      const skillDirectory = await resolveSkillDirectory(
        invocationDirectory,
        options.skill,
      );
      const workspace = await scaffoldEval(
        skillDirectory,
        options.eval,
        resolve(invocationDirectory, options.output),
      );
      const manifest = await loadManifest(skillDirectory);
      const evalCase = manifest.evals.find(({ name }) => name === options.eval);
      console.log(`Workspace: ${workspace}`);
      console.log(`Eval: ${options.eval}`);
      const environmentVariable =
        manifest.runner.knowledge_base?.environment_variable;
      console.log(
        environmentVariable && process.env[environmentVariable]
          ? `${environmentVariable}: ${process.env[environmentVariable]}`
          : `${environmentVariable ?? "Knowledge base"}: not set`,
      );
      console.log(`\nPrompt:\n${evalCase?.prompt ?? ""}`);
    },
  );

program
  .command("eval")
  .requiredOption("--skill <directory>", "Skill directory")
  .addOption(
    new Option("--eval <name>", "Run only this eval").argParser(
      (value: string, previous: readonly string[] = []) => [...previous, value],
    ),
  )
  .option("--output <directory>", "Artifact directory")
  .option("--baseline-ref <ref>", "Git ref for the baseline skill")
  .option(
    "--no-baseline",
    "Compare the local skill with a run that has no skill plugin",
  )
  .option(
    "--current-only",
    "Grade only the local skill; skip baseline and comparison",
    false,
  )
  .option("--dry-run", "Prepare runtime and fixtures without AI calls", false)
  .option("--copilot-bin <path>", "Copilot CLI executable", "copilot")
  .option("--main-model <model>", "Model for skill runs", "gpt-5.6-sol")
  .option("--grader-model <model>", "Model for grading", "gpt-5-mini")
  .option(
    "--reasoning-effort <effort>",
    "Copilot reasoning effort",
    (value: string) => reasoningEffortSchema.parse(value),
    "high",
  )
  .option(
    "--max-ai-credits <credits>",
    "Per-session AI credit limit",
    (value: string) => maxAiCreditsSchema.parse(value),
  )
  .option(
    "-v, --verbose [level]",
    "Stream local progress. Repeat or pass 2 (-vv, --verbose=2) for agent Q&A and tool arguments",
  )
  .action(
    async (
      options: Omit<EvalOptions, "noBaseline" | "verbosity"> & {
        baseline?: boolean;
      },
    ) =>
      runEval({
        ...options,
        currentOnly: options.currentOnly ?? false,
        eval: options.eval ?? [],
        maxAiCredits: options.maxAiCredits ?? 30,
        noBaseline: options.baseline === false,
        verbosity: parseCliVerbosity(process.argv),
      }),
  );

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  if (parseCliVerbosity(process.argv) >= 1 && error instanceof Error) {
    console.error(error.stack);
  }
  process.exitCode = 1;
});
