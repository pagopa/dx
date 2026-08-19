/**
 * Portable eval manifest contract.
 *
 * Skills own evals.json; this module is the only place that defines what that
 * file may contain. The runner, validator, and hooks all consume the inferred
 * types so skill-specific behavior cannot leak into the shared package.
 */
import { z } from "zod";

const nonEmptyString = z.string().min(1);

/** Current skill under test versus the previous committed copy. */
export const evalVariantSchema = z.enum(["baseline", "current"]);

/** Copilot CLI `--effort` values accepted by the eval runner. */
export const reasoningEffortSchema = z.enum(["low", "medium", "high", "xhigh"]);

export const hookNameSchema = z.enum([
  "after_all",
  "after_each",
  "before_all",
  "before_each",
]);

export const knowledgeBaseAvailabilitySchema = z.enum([
  "available",
  "unavailable",
]);

/**
 * Fixture files are layered from evals/scaffolds/<name>/repository/ onto a
 * disposable workspace. The path after repository/ is the destination.
 * `..` is rejected so a manifest cannot copy files outside the skill.
 */
export const fixturePathSchema = nonEmptyString.refine(
  (value) =>
    value.startsWith("evals/scaffolds/") &&
    value.includes("/repository/") &&
    !value.includes(".."),
  "Fixture paths must be under evals/scaffolds/**/repository/",
);

/**
 * Skill hooks stay under `evals/` so they are not copied into the isolated
 * plugin the agent sees.
 */
const hookPathSchema = nonEmptyString.refine(
  (value) => value.startsWith("evals/") && !value.includes(".."),
  "Hook scripts must be relative paths under evals/",
);

const gradingDocumentSchema = nonEmptyString.refine(
  (value) => value.startsWith("evals/") && value.endsWith(".md"),
  "Grading documents must be Markdown files under evals/",
);

const environmentVariableSchema = nonEmptyString.regex(
  /^[A-Z][A-Z0-9_]*$/,
  "Must be a POSIX environment variable name",
);

const regexPatternSchema = nonEmptyString.refine((value) => {
  try {
    RegExp(value);
    return true;
  } catch {
    return false;
  }
}, "Must be a valid regular expression");

/**
 * Angle-bracket tokens in prompts are treated as unresolved template holes.
 * Follow-ups and assertions may still mention them as expected behavior.
 */
const promptSchema = nonEmptyString.refine(
  (value) => !/<[^>]+>/.test(value),
  "Prompt contains an unresolved <placeholder>",
);

const supportingSkillSchema = z.object({
  name: nonEmptyString,
  repository_path: nonEmptyString,
});

const knowledgeBaseSchema = z.object({
  clone_url: z.url(),
  environment_variable: environmentVariableSchema,
  fallback_path: nonEmptyString,
  markers: z.array(nonEmptyString).min(1),
});

const coverageSchema = z.object({
  catalog: nonEmptyString,
  pattern: regexPatternSchema,
  require_all: z.boolean().default(true),
});

const validationSchema = z.object({
  coverage: coverageSchema.optional(),
  required_fixture_prefixes: z.array(fixturePathSchema).default([]),
});

const gradingSchema = z.object({
  instructions: gradingDocumentSchema,
  rubric: gradingDocumentSchema,
});

const hooksSchema = z
  .object({
    after_all: hookPathSchema.optional(),
    after_each: hookPathSchema.optional(),
    before_all: hookPathSchema.optional(),
    before_each: hookPathSchema.optional(),
  })
  .default({});

const runnerSchema = z.object({
  available_tools: z.array(nonEmptyString).min(1),
  knowledge_base: knowledgeBaseSchema.optional(),
  prompt_prefix: nonEmptyString,
  supporting_skills: z.array(supportingSkillSchema).default([]),
});

export const evalCaseSchema = z.object({
  assertions: z.array(nonEmptyString).min(1),
  expected_output: nonEmptyString,
  files: z.array(fixturePathSchema),
  fixture_required: z.boolean(),
  follow_up: nonEmptyString.optional(),
  id: z.number().int().nonnegative(),
  knowledge_base: knowledgeBaseAvailabilitySchema.default("unavailable"),
  name: nonEmptyString,
  prompt: promptSchema,
});

export const skillEvalManifestSchema = z
  .object({
    evals: z.array(evalCaseSchema).min(1),
    grading: gradingSchema,
    hooks: hooksSchema,
    runner: runnerSchema,
    schema_version: z.literal(1),
    skill_name: nonEmptyString,
    validation: validationSchema.default({
      required_fixture_prefixes: [],
    }),
  })
  .superRefine((manifest, context) => {
    const ids = new Set<number>();
    const names = new Set<string>();

    for (const [index, evalCase] of manifest.evals.entries()) {
      if (ids.has(evalCase.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate eval ID: ${evalCase.id}`,
          path: ["evals", index, "id"],
        });
      }
      if (names.has(evalCase.name)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate eval name: ${evalCase.name}`,
          path: ["evals", index, "name"],
        });
      }
      ids.add(evalCase.id);
      names.add(evalCase.name);
    }
  });

export type EvalCase = z.infer<typeof evalCaseSchema>;
export type EvalVariant = z.infer<typeof evalVariantSchema>;
export type HookName = z.infer<typeof hookNameSchema>;
export type ReasoningEffort = z.infer<typeof reasoningEffortSchema>;
export type SkillEvalManifest = z.infer<typeof skillEvalManifestSchema>;

/** Parses JSON from disk or a subprocess. Callers still validate the value. */
export const parseJson = (content: string, label: string): unknown => {
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON in ${label}`, { cause: error });
  }
};
