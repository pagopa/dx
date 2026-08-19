/**
 * Defines the portable manifest contract consumed by the shared skill eval runner.
 */
import { z } from "zod";

const nonEmptyString = z.string().min(1);

const supportingSkillSchema = z.object({
  name: nonEmptyString,
  repository_path: nonEmptyString,
});

const knowledgeBaseSchema = z.object({
  clone_url: nonEmptyString,
  environment_variable: nonEmptyString,
  fallback_path: nonEmptyString,
  markers: z.array(nonEmptyString).min(1),
});

const coverageSchema = z.object({
  catalog: nonEmptyString,
  pattern: nonEmptyString,
  require_all: z.boolean().default(true),
});

const validationSchema = z.object({
  coverage: coverageSchema.optional(),
  required_fixture_prefixes: z.array(nonEmptyString).default([]),
});

const gradingSchema = z.object({
  instructions: nonEmptyString,
  rubric: nonEmptyString,
});

const hookPathSchema = nonEmptyString.refine(
  (value) => value.startsWith("evals/") && !value.includes(".."),
  "Hook scripts must be relative paths under evals/",
);

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
  files: z.array(nonEmptyString),
  fixture_required: z.boolean(),
  follow_up: nonEmptyString.optional(),
  id: z.number().int().nonnegative(),
  knowledge_base: z.enum(["available", "unavailable"]).default("unavailable"),
  name: nonEmptyString,
  prompt: nonEmptyString,
});

export const skillEvalManifestSchema = z.object({
  evals: z.array(evalCaseSchema).min(1),
  grading: gradingSchema,
  hooks: hooksSchema,
  runner: runnerSchema,
  schema_version: z.literal(1),
  skill_name: nonEmptyString,
  validation: validationSchema.default({
    required_fixture_prefixes: [],
  }),
});

export type EvalCase = z.infer<typeof evalCaseSchema>;
export type HookName =
  "after_all" | "after_each" | "before_all" | "before_each";
export type SkillEvalManifest = z.infer<typeof skillEvalManifestSchema>;
