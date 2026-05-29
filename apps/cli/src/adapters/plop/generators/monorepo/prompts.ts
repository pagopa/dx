/**
 * Defines the interactive questions for the monorepo plop generator.
 * The init command can prefill some answers via CLI flags, so we only
 * return prompts for values that are still missing.
 */
import { type PlopGeneratorConfig } from "node-plop";
import { z } from "zod/v4";

import { validatePrompt } from "../../helpers/validate-prompt.js";

export const DEFAULT_REPO_OWNER = "pagopa";

export const payloadSchema = z.object({
  repoDescription: z.string().optional(),
  repoName: z.string().trim().min(1, "Repository name cannot be empty"),
  repoOwner: z.string().trim().default(DEFAULT_REPO_OWNER),
});

export type Payload = z.infer<typeof payloadSchema>;

const createRepoNamePrompt = () => ({
  message: "Name",
  name: "repoName" as const,
  validate: validatePrompt(payloadSchema.shape.repoName),
});

const createRepoOwnerPrompt = () => ({
  default: DEFAULT_REPO_OWNER,
  message: "GitHub Organization",
  name: "repoOwner" as const,
  validate: validatePrompt(payloadSchema.shape.repoOwner),
});

const createRepoDescriptionPrompt = () => ({
  message: "Description",
  name: "repoDescription" as const,
});

type PromptFactory = {
  create: () =>
    | ReturnType<typeof createRepoDescriptionPrompt>
    | ReturnType<typeof createRepoNamePrompt>
    | ReturnType<typeof createRepoOwnerPrompt>;
  isMissing: (answers: Partial<Payload>) => boolean;
};

const promptFactories: PromptFactory[] = [
  {
    create: createRepoNamePrompt,
    isMissing: ({ repoName }) => typeof repoName === "undefined",
  },
  {
    create: createRepoOwnerPrompt,
    isMissing: ({ repoOwner }) => typeof repoOwner === "undefined",
  },
  {
    create: createRepoDescriptionPrompt,
    isMissing: ({ repoDescription }) => typeof repoDescription === "undefined",
  },
];

export const getPrompts = (
  answers: Partial<Payload> = {},
): PlopGeneratorConfig["prompts"] =>
  promptFactories
    .filter(({ isMissing }) => isMissing(answers))
    .map(({ create }) => create());

export default getPrompts;
