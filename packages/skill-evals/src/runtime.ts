/**
 * Prepares isolated current/baseline plugins and shared runtime configuration.
 */
import {
  cp,
  mkdir,
  mkdtemp,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";

import { runCommand } from "./process.js";
import { type SkillEvalManifest } from "./schema.js";

export type RuntimeConfiguration = Readonly<{
  baselineLabel: string;
  baselinePlugin: string;
  copilotBin: string;
  currentPlugin: string;
  disabledMcps: readonly string[];
  graderModel: string;
  invocationDirectory: string;
  knowledgeBase?: string;
  mainModel: string;
  maxAiCredits: number;
  outputDirectory: string;
  reasoningEffort: string;
  skillDirectory: string;
}>;

type PrepareRuntimeOptions = Readonly<{
  baselineRef?: string;
  copilotBin: string;
  graderModel: string;
  invocationDirectory: string;
  knowledgeBaseEnvironmentPath?: string;
  mainModel: string;
  maxAiCredits: number;
  outputDirectory: string;
  reasoningEffort: string;
  skillDirectory: string;
}>;

const isDirectory = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isDirectory();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
};

const createPluginManifest = async (
  pluginDirectory: string,
  name: string,
): Promise<void> => {
  await mkdir(join(pluginDirectory, ".plugin"), { recursive: true });
  await writeFile(
    join(pluginDirectory, ".plugin/plugin.json"),
    `${JSON.stringify(
      {
        description: "Isolated plugin wrapper for skill evaluations",
        name,
        version: "0.0.0",
      },
      null,
      2,
    )}\n`,
  );
};

const copySkill = async (
  sourceSkill: string,
  pluginDirectory: string,
  skillName: string,
): Promise<void> => {
  const target = join(pluginDirectory, "skills", skillName);
  await mkdir(target, { recursive: true });
  await cp(sourceSkill, target, {
    filter: (source) => {
      const name = basename(source);
      return name !== "evals" && name !== "scripts";
    },
    recursive: true,
  });
};

const gitRepositoryRoot = async (
  skillDirectory: string,
): Promise<string | undefined> => {
  const result = await runCommand("git", ["rev-parse", "--show-toplevel"], {
    cwd: skillDirectory,
  });
  return result.exitCode === 0 ? result.stdout.trim() : undefined;
};

const resolveBaselineRef = async (
  repositoryRoot: string,
  skillRelativePath: string,
  requestedRef?: string,
): Promise<string | undefined> => {
  if (requestedRef) {
    return requestedRef;
  }

  const result = await runCommand(
    "git",
    ["log", "--format=%H", "--", join(skillRelativePath, "SKILL.md")],
    { cwd: repositoryRoot },
  );
  if (result.exitCode !== 0) {
    return undefined;
  }

  return result.stdout.split("\n").filter(Boolean)[1];
};

const createBaselinePlugin = async (
  repositoryRoot: string | undefined,
  skillDirectory: string,
  skillName: string,
  pluginDirectory: string,
  runtimeDirectory: string,
  requestedRef?: string,
): Promise<string> => {
  await createPluginManifest(pluginDirectory, "skill-eval-baseline");
  if (!repositoryRoot) {
    return "without-skill";
  }

  const skillRelativePath = relative(repositoryRoot, skillDirectory);
  const baselineRef = await resolveBaselineRef(
    repositoryRoot,
    skillRelativePath,
    requestedRef,
  );
  if (!baselineRef) {
    return "without-skill";
  }

  const exists = await runCommand(
    "git",
    ["cat-file", "-e", `${baselineRef}:${skillRelativePath}/SKILL.md`],
    { cwd: repositoryRoot },
  );
  if (exists.exitCode !== 0) {
    return "without-skill";
  }

  const archive = join(runtimeDirectory, "baseline.tar");
  const source = join(runtimeDirectory, "baseline-source");
  await mkdir(source, { recursive: true });

  const archived = await runCommand(
    "git",
    [
      "archive",
      "--format=tar",
      `--output=${archive}`,
      baselineRef,
      skillRelativePath,
    ],
    { cwd: repositoryRoot },
  );
  if (archived.exitCode !== 0) {
    throw new Error(`Unable to archive baseline: ${archived.stderr.trim()}`);
  }

  const extracted = await runCommand("tar", ["-xf", archive, "-C", source]);
  await rm(archive);
  if (extracted.exitCode !== 0) {
    throw new Error(`Unable to extract baseline: ${extracted.stderr.trim()}`);
  }

  await copySkill(join(source, skillRelativePath), pluginDirectory, skillName);
  return `git:${baselineRef}`;
};

const installedSkills = async (
  copilotBin: string,
  invocationDirectory: string,
): Promise<
  readonly Readonly<{ enabled: boolean; name: string; path: string }>[]
> => {
  const result = await runCommand(copilotBin, [
    "-C",
    invocationDirectory,
    "skill",
    "list",
    "--json",
  ]);
  if (result.exitCode !== 0) {
    return [];
  }

  const parsed: unknown = JSON.parse(result.stdout);
  return Array.isArray(parsed)
    ? parsed.filter(
        (
          value,
        ): value is Readonly<{
          enabled: boolean;
          name: string;
          path: string;
        }> =>
          typeof value === "object" &&
          value !== null &&
          "enabled" in value &&
          typeof value.enabled === "boolean" &&
          "name" in value &&
          typeof value.name === "string" &&
          "path" in value &&
          typeof value.path === "string",
      )
    : [];
};

const copySupportingSkills = async (
  manifest: SkillEvalManifest,
  repositoryRoot: string | undefined,
  currentPlugin: string,
  baselinePlugin: string,
  copilotBin: string,
  invocationDirectory: string,
): Promise<void> => {
  const skills = await installedSkills(copilotBin, invocationDirectory);

  for (const supportingSkill of manifest.runner.supporting_skills) {
    const repositoryCandidate = repositoryRoot
      ? join(repositoryRoot, supportingSkill.repository_path)
      : undefined;
    const installed = skills.find(
      (skill) => skill.name === supportingSkill.name && skill.enabled,
    );
    const source =
      repositoryCandidate && (await isDirectory(repositoryCandidate))
        ? repositoryCandidate
        : installed
          ? dirname(installed.path)
          : undefined;

    if (source && (await isDirectory(source))) {
      await Promise.all([
        copySkill(source, currentPlugin, supportingSkill.name),
        copySkill(source, baselinePlugin, supportingSkill.name),
      ]);
    }
  }
};

const isKnowledgeBase = async (
  path: string,
  markers: readonly string[],
): Promise<boolean> => {
  for (const marker of markers) {
    if (!(await isDirectory(join(path, marker)))) {
      return false;
    }
  }
  return true;
};

const resolveKnowledgeBase = async (
  manifest: SkillEvalManifest,
  repositoryRoot: string | undefined,
  invocationDirectory: string,
  runtimeDirectory: string,
  environmentPath?: string,
): Promise<string | undefined> => {
  const config = manifest.runner.knowledge_base;
  const required = manifest.evals.some(
    (evalCase) => evalCase.knowledge_base === "available",
  );
  if (!required || !config) {
    return undefined;
  }

  const fallback = config.fallback_path.replace(/^~/, homedir());
  const candidates = [
    environmentPath,
    repositoryRoot,
    invocationDirectory,
    fallback,
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (await isKnowledgeBase(candidate, config.markers)) {
      return realpath(candidate);
    }
  }

  const clone = join(runtimeDirectory, "knowledge-base");
  const result = await runCommand("git", [
    "clone",
    "--depth",
    "1",
    "--quiet",
    config.clone_url,
    clone,
  ]);
  if (result.exitCode !== 0) {
    throw new Error(
      `Unable to clone the knowledge base: ${result.stderr.trim()}`,
    );
  }
  return clone;
};

const disabledMcps = async (
  copilotBin: string,
  outputDirectory: string,
): Promise<readonly string[]> => {
  const result = await runCommand(copilotBin, [
    "-C",
    outputDirectory,
    "mcp",
    "list",
    "--json",
  ]);
  if (result.exitCode !== 0) {
    return [];
  }

  const parsed: unknown = JSON.parse(result.stdout);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("mcpServers" in parsed) ||
    typeof parsed.mcpServers !== "object" ||
    parsed.mcpServers === null
  ) {
    return [];
  }
  return Object.keys(parsed.mcpServers);
};

export const prepareRuntime = async (
  manifest: SkillEvalManifest,
  options: PrepareRuntimeOptions,
): Promise<RuntimeConfiguration> => {
  const runtimeDirectory = join(options.outputDirectory, "runtime");
  const currentPlugin = join(runtimeDirectory, "current-plugin");
  const baselinePlugin = join(runtimeDirectory, "baseline-plugin");
  const repositoryRoot = await gitRepositoryRoot(options.skillDirectory);

  await Promise.all([
    createPluginManifest(currentPlugin, "skill-eval-current"),
    mkdir(join(baselinePlugin, "skills"), { recursive: true }),
  ]);
  await copySkill(options.skillDirectory, currentPlugin, manifest.skill_name);
  const baselineLabel = await createBaselinePlugin(
    repositoryRoot,
    options.skillDirectory,
    manifest.skill_name,
    baselinePlugin,
    runtimeDirectory,
    options.baselineRef,
  );
  await copySupportingSkills(
    manifest,
    repositoryRoot,
    currentPlugin,
    baselinePlugin,
    options.copilotBin,
    options.invocationDirectory,
  );

  return {
    baselineLabel,
    baselinePlugin,
    copilotBin: options.copilotBin,
    currentPlugin,
    disabledMcps: await disabledMcps(
      options.copilotBin,
      options.outputDirectory,
    ),
    graderModel: options.graderModel,
    invocationDirectory: options.invocationDirectory,
    knowledgeBase: await resolveKnowledgeBase(
      manifest,
      repositoryRoot,
      options.invocationDirectory,
      runtimeDirectory,
      options.knowledgeBaseEnvironmentPath,
    ),
    mainModel: options.mainModel,
    maxAiCredits: options.maxAiCredits,
    outputDirectory: options.outputDirectory,
    reasoningEffort: options.reasoningEffort,
    skillDirectory: options.skillDirectory,
  };
};

export const createTemporaryOutput = async (
  skillName: string,
): Promise<string> => {
  const root = join(tmpdir(), "skill-evals", skillName);
  await mkdir(root, { recursive: true });
  return mkdtemp(
    join(root, `${new Date().toISOString().replaceAll(/[:.]/g, "")}-`),
  );
};
