/**
 * Collects optional personal or required organization owners before generation.
 */
import inquirer from "inquirer";
import { z } from "zod/v4";

import type { GitHubService } from "../../domain/github.js";

import {
  codeOwnerSchema,
  type GitHubAccount,
  resolveCodeOwnership,
} from "../../domain/code-ownership.js";

const entries = (value: string): string[] =>
  value.trim() ? value.trim().split(/\s+/) : [];

export const collectCodeOwnership = async (
  namespace: GitHubAccount,
  references: string[] | undefined,
  github: GitHubService,
  nonInteractive: boolean,
) => {
  if (references !== undefined || nonInteractive) {
    return resolveCodeOwnership(namespace, references ?? [], github);
  }
  const answer: unknown = await inquirer.prompt({
    message: `Code owners (@username or @${namespace.login}/team, separated by spaces${namespace.type === "User" ? `; @${namespace.login} is included automatically` : "; required"})`,
    name: "codeOwners",
    type: "input",
    validate: (value: string) => {
      const owners = entries(value);
      if (owners.length === 0 && namespace.type === "Organization") {
        return "At least one code owner is required";
      }
      return owners.every((owner) => codeOwnerSchema.safeParse(owner).success)
        ? true
        : "Use @username or @organization/team, separated by spaces";
    },
  });
  const parsed = z.object({ codeOwners: z.string() }).safeParse(answer);
  if (!parsed.success) {
    throw new Error("Invalid code-owner prompt answers", {
      cause: parsed.error,
    });
  }
  return resolveCodeOwnership(
    namespace,
    entries(parsed.data.codeOwners),
    github,
  );
};
