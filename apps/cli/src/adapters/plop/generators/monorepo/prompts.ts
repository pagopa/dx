/**
 * Defines the interactive questions for the monorepo plop generator.
 * The init command can prefill some answers via CLI flags, so we only
 * return prompts for values that are still missing.
 */
import { type PlopGeneratorConfig } from "node-plop";
import { z } from "zod/v4";

import { validatePrompt } from "../../helpers/validate-prompt.js";

export const DEFAULT_REPO_OWNER = "pagopa";

export const repoTopicsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(50)
      .regex(/^[a-z0-9-]+$/, {
        message:
          "Topics must contain only lowercase letters, numbers, and hyphens",
      }),
  )
  .max(20);

export const splitTopics = (input: string): string[] =>
  input
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean);

export const payloadSchema = z.object({
  repoDescription: z.string().optional(),
  repoName: z.string().trim().min(1, "Repository name cannot be empty"),
  repoOwner: z.string().trim().default(DEFAULT_REPO_OWNER),
  repoTopics: repoTopicsSchema.default([]),
});

export type Payload = z.infer<typeof payloadSchema>;

type MonorepoPrompt = {
  default?: string;
  filter?: typeof splitTopics;
  message: string;
  name: keyof Payload;
  validate?: ReturnType<typeof validatePrompt>;
};

const prompts: MonorepoPrompt[] = [
  {
    message: "Name",
    name: "repoName",
    validate: validatePrompt(payloadSchema.shape.repoName),
  },
  {
    default: DEFAULT_REPO_OWNER,
    message: "GitHub owner",
    name: "repoOwner",
    validate: validatePrompt(payloadSchema.shape.repoOwner),
  },
  {
    message: "Description",
    name: "repoDescription",
  },
  {
    default: "",
    filter: splitTopics,
    message: "Repository topics (comma-separated, optional)",
    name: "repoTopics",
    validate: validatePrompt(repoTopicsSchema),
  },
];

export const getPrompts = (
  answers: Partial<Payload> = {},
): PlopGeneratorConfig["prompts"] =>
  prompts.filter(({ name }) => answers[name] === undefined);

export default getPrompts;
