/**
 * Loads evals.json and checks the skill tree on disk.
 *
 * Shape, uniqueness, and path format live in schema.ts. This module only
 * answers questions that need the filesystem: do fixtures exist, do hook
 * scripts exist, and does every catalog ID appear in some assertion.
 */
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import {
  type EvalCase,
  parseJson,
  type SkillEvalManifest,
  skillEvalManifestSchema,
} from "./schema.js";

export type ManifestValidation = Readonly<{
  evalCount: number;
  guardrailCount: number;
  warnings: readonly string[];
}>;

const exists = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isFile();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
};

const extractMatches = (value: string, pattern: string): readonly string[] => {
  const expression = new RegExp(pattern, "g");
  return [...value.matchAll(expression)].map(([match]) => match);
};

/**
 * Destination of a scaffold file inside the disposable workspace.
 * `evals/scaffolds/base/repository/infra/main.tf` → `infra/main.tf`.
 */
const relativeFixtureTarget = (file: string): string => {
  const marker = "/repository/";
  const markerIndex = file.indexOf(marker);

  if (markerIndex === -1) {
    throw new Error(`Invalid scaffold path: ${file}`);
  }

  return file.slice(markerIndex + marker.length);
};

const validateFixture = async (
  skillDirectory: string,
  evalCase: EvalCase,
  strictFiles: boolean,
  requiredPrefixes: readonly string[],
): Promise<readonly string[]> => {
  if (evalCase.fixture_required && evalCase.files.length === 0) {
    if (strictFiles) {
      throw new Error(`Eval ${evalCase.name} requires fixture files.`);
    }
    return [`Eval ${evalCase.name} requires fixture files.`];
  }

  const targets = new Set<string>();
  for (const file of evalCase.files) {
    if (!(await exists(join(skillDirectory, file)))) {
      throw new Error(`Missing eval fixture: ${file}`);
    }

    const target = relativeFixtureTarget(file);
    if (targets.has(target)) {
      throw new Error(
        `Eval ${evalCase.name} maps multiple files to ${target}.`,
      );
    }
    targets.add(target);
  }

  if (evalCase.fixture_required) {
    for (const prefix of requiredPrefixes) {
      // Shared prefixes keep overlay-only evals from omitting the base tree.
      if (!evalCase.files.some((file) => file.startsWith(prefix))) {
        throw new Error(
          `Eval ${evalCase.name} requires a fixture under ${prefix}.`,
        );
      }
    }
  }

  return [];
};

const validateCoverage = async (
  skillDirectory: string,
  manifest: SkillEvalManifest,
): Promise<number> => {
  const coverage = manifest.validation.coverage;
  if (!coverage) {
    return 0;
  }

  const catalog = await readFile(
    join(skillDirectory, coverage.catalog),
    "utf8",
  );
  const known = new Set(extractMatches(catalog, coverage.pattern));
  const referenced = new Set(
    manifest.evals.flatMap((evalCase) =>
      evalCase.assertions.flatMap((assertion) =>
        extractMatches(assertion, coverage.pattern),
      ),
    ),
  );
  const unknown = [...referenced].filter((guardrail) => !known.has(guardrail));
  const missing = [...known].filter((guardrail) => !referenced.has(guardrail));

  if (unknown.length > 0) {
    throw new Error(`Unknown guardrails: ${unknown.join(", ")}`);
  }
  if (coverage.require_all && missing.length > 0) {
    throw new Error(`Guardrails without eval coverage: ${missing.join(", ")}`);
  }

  return known.size;
};

const validateHooks = async (
  skillDirectory: string,
  manifest: SkillEvalManifest,
): Promise<void> => {
  for (const [name, script] of Object.entries(manifest.hooks)) {
    if (script && !(await exists(join(skillDirectory, script)))) {
      throw new Error(`Missing ${name} hook: ${script}`);
    }
  }
};

/** Parses and schema-validates evals.json. Does not touch the filesystem tree. */
export const loadManifest = async (
  skillDirectory: string,
): Promise<SkillEvalManifest> => {
  const content = await readFile(
    join(skillDirectory, "evals/evals.json"),
    "utf8",
  );
  const parsed = skillEvalManifestSchema.safeParse(
    parseJson(content, "evals/evals.json"),
  );

  if (!parsed.success) {
    throw new Error(
      `Invalid eval manifest:\n${zodIssues(parsed.error.issues)}`,
    );
  }

  return parsed.data;
};

const zodIssues = (
  issues: readonly Readonly<{ message: string; path: PropertyKey[] }>[],
): string =>
  issues
    .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

/** Schema plus on-disk fixtures, hooks, and catalog coverage. */
export const validateManifest = async (
  skillDirectory: string,
  strictFiles: boolean,
): Promise<ManifestValidation> => {
  const manifest = await loadManifest(skillDirectory);
  const warnings: string[] = [];

  for (const evalCase of manifest.evals) {
    warnings.push(
      ...(await validateFixture(
        skillDirectory,
        evalCase,
        strictFiles,
        manifest.validation.required_fixture_prefixes,
      )),
    );
  }

  await validateHooks(skillDirectory, manifest);

  return {
    evalCount: manifest.evals.length,
    guardrailCount: await validateCoverage(skillDirectory, manifest),
    warnings,
  };
};

export const fixtureTarget = relativeFixtureTarget;
