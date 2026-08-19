/**
 * Runs optional skill-owned lifecycle scripts declared in evals.json.
 *
 * The package stays skill-agnostic: hooks live under evals/ and never reach
 * the isolated plugin. A non-zero exit fails the suite. after_each may print
 * a flat JSON object that is merged into mechanical.json.
 */
import { join } from "node:path";
import { z } from "zod";

import { runCommand } from "./process.js";
import {
  type EvalVariant,
  type HookName,
  type SkillEvalManifest,
} from "./schema.js";

export type HookContext = Readonly<{
  artifactDirectory?: string;
  evalName?: string;
  outputDirectory: string;
  skillDirectory: string;
  variant?: EvalVariant;
  workspace?: string;
}>;

export type HookOutput = Readonly<
  Record<string, boolean | null | number | string>
>;

const hookOutputSchema = z.record(
  z.string(),
  z.union([z.boolean(), z.number(), z.string(), z.null()]),
);

const hookEnvironment = (
  name: HookName,
  context: HookContext,
  environment: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv => ({
  ...environment,
  SKILL_EVAL_HOOK: name,
  SKILL_EVAL_OUTPUT_DIR: context.outputDirectory,
  SKILL_EVAL_SKILL_DIR: context.skillDirectory,
  ...(context.artifactDirectory
    ? { SKILL_EVAL_ARTIFACT_DIR: context.artifactDirectory }
    : {}),
  ...(context.evalName ? { SKILL_EVAL_NAME: context.evalName } : {}),
  ...(context.variant ? { SKILL_EVAL_VARIANT: context.variant } : {}),
  ...(context.workspace ? { SKILL_EVAL_WORKSPACE: context.workspace } : {}),
});

/**
 * Hooks often print logs. Only a single JSON object is treated as output;
 * anything else is ignored so diagnostic text cannot fail a passing run.
 */
const parseHookOutput = (stdout: string): HookOutput => {
  const trimmed = stdout.trim();
  if (!trimmed.startsWith("{")) {
    return {};
  }

  try {
    const parsed = hookOutputSchema.safeParse(JSON.parse(trimmed));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
};

/** Runs one declared hook, or returns {} when the skill omitted that slot. */
export const runSkillHook = async (
  hooks: SkillEvalManifest["hooks"],
  name: HookName,
  context: HookContext,
  environment: NodeJS.ProcessEnv,
): Promise<HookOutput> => {
  const script = hooks[name];
  if (!script) {
    return {};
  }

  const path = join(context.skillDirectory, script);
  const result = await runCommand(path, [], {
    cwd: context.workspace ?? context.skillDirectory,
    env: hookEnvironment(name, context, environment),
  });
  if (result.exitCode !== 0) {
    throw new Error(
      `Hook ${name} (${script}) failed: ${result.stderr.trim() || result.stdout.trim()}`,
    );
  }

  return parseHookOutput(result.stdout);
};
