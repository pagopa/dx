#!/usr/bin/env node
import { Command, Option } from "commander";
/**
 * Exposes reusable validate, scaffold, and non-interactive eval commands.
 */
import { mkdir, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { prepareEvalWorkspace } from "./copilot-run.js";
import { loadManifest, validateManifest } from "./manifest.js";
import { runCommand } from "./process.js";
import { createRunConfiguration, runEvaluationSuite } from "./runner.js";
import {
  createTemporaryOutput,
  prepareRuntime,
  type RuntimeConfiguration,
} from "./runtime.js";
import { scaffoldEval } from "./scaffold.js";

type EvalOptions = Readonly<{
  baselineRef?: string;
  copilotBin: string;
  dryRun: boolean;
  eval: readonly string[];
  graderModel: string;
  mainModel: string;
  maxAiCredits: number;
  output?: string;
  reasoningEffort: string;
}> &
  SharedOptions;

type SharedOptions = Readonly<{
  skill: string;
}>;

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
        baseline: runtime.baselineLabel,
        createdAt: new Date().toISOString(),
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
  const invocationDirectory = await resolveInvocationDirectory();
  const skillDirectory = await resolveSkillDirectory(
    invocationDirectory,
    options.skill,
  );
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
  const runtime = await prepareRuntime(
    { ...manifest, evals: selectedEvals },
    {
      baselineRef: options.baselineRef,
      copilotBin: options.copilotBin,
      graderModel: options.graderModel,
      invocationDirectory,
      knowledgeBaseEnvironmentPath: manifest.runner.knowledge_base
        ? process.env[manifest.runner.knowledge_base.environment_variable]
        : undefined,
      mainModel: options.mainModel,
      maxAiCredits: options.maxAiCredits,
      outputDirectory,
      reasoningEffort: options.reasoningEffort,
      skillDirectory,
    },
  );
  await writeMetadata(
    runtime,
    selectedEvals.map(({ name }) => name),
  );

  if (options.dryRun) {
    const current = createRunConfiguration(manifest, runtime, "current");
    const baseline = createRunConfiguration(manifest, runtime, "baseline");
    for (const evalCase of selectedEvals) {
      await Promise.all([
        prepareEvalWorkspace(
          current,
          evalCase,
          join(outputDirectory, evalCase.name, "current", "workspace"),
        ),
        prepareEvalWorkspace(
          baseline,
          evalCase,
          join(outputDirectory, evalCase.name, "baseline", "workspace"),
        ),
      ]);
    }
    console.log(
      `Prepared ${selectedEvals.length} evals at ${outputDirectory}.`,
    );
    return;
  }

  const result = await runEvaluationSuite(
    manifest,
    runtime,
    selectedEvals,
    process.env,
  );
  console.log(`Eval report: ${result.reportPath}`);
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
  .option("--dry-run", "Prepare runtime and fixtures without AI calls", false)
  .option("--copilot-bin <path>", "Copilot CLI executable", "copilot")
  .option("--main-model <model>", "Model for skill runs", "gpt-5.6-sol")
  .option("--grader-model <model>", "Model for grading", "gpt-5-mini")
  .option("--reasoning-effort <effort>", "Copilot reasoning effort", "high")
  .option(
    "--max-ai-credits <credits>",
    "Per-session AI credit limit",
    (value) => Number.parseInt(value, 10),
  )
  .action(async (options: EvalOptions) =>
    runEval({
      ...options,
      eval: options.eval ?? [],
      maxAiCredits: options.maxAiCredits ?? 30,
    }),
  );

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
