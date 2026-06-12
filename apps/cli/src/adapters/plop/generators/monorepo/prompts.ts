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

type MonorepoPrompt = {
  default?: string;
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
];

export const getPrompts = (
  answers: Partial<Payload> = {},
): PlopGeneratorConfig["prompts"] =>
  prompts.filter(({ name }) => answers[name] === undefined);

export default getPrompts;
