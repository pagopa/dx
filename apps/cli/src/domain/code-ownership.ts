/**
 * Resolves repository code owners once for CODEOWNERS and deployment reviewers.
 * Repository access grants remain part of the manual authorization process.
 */
import { z } from "zod/v4";

import type { GitHubService } from "./github.js";

const login = "[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}";

export const codeOwnerSchema = z
  .string()
  .trim()
  .regex(
    new RegExp(`^@${login}(?:/[a-zA-Z0-9][a-zA-Z0-9_-]*)?$`),
    "Code owner must be @username or @organization/team",
  );

export const githubAccountSchema = z.object({
  login: z.string().regex(new RegExp(`^${login}$`)),
  type: z.enum(["User", "Organization"]),
});

export const githubTeamSchema = z.object({
  parent: z.object({ slug: z.string() }).nullable().optional(),
  privacy: z.enum(["closed", "secret"]),
  slug: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
});

export const codeOwnershipSchema = z.object({
  namespaceType: z.enum(["User", "Organization"]),
  owners: z.array(codeOwnerSchema).min(1),
  reviewerTeams: z.array(githubTeamSchema.shape.slug),
});

export type CodeOwnership = z.infer<typeof codeOwnershipSchema>;
export type GitHubAccount = z.infer<typeof githubAccountSchema>;
export type GitHubTeam = z.infer<typeof githubTeamSchema>;

const unique = (values: string[]): string[] =>
  values.filter(
    (value, index) =>
      values.findIndex(
        (candidate) => candidate.toLowerCase() === value.toLowerCase(),
      ) === index,
  );

export const resolveCodeOwnership = async (
  namespace: GitHubAccount,
  references: string[],
  github: GitHubService,
): Promise<CodeOwnership> => {
  const parsed = z.array(codeOwnerSchema).safeParse(references);
  if (!parsed.success) {
    throw new Error(
      "Invalid code owners. Use --code-owner @username or --code-owner @organization/team; blank values are not allowed.",
      { cause: parsed.error },
    );
  }
  const owners = namespace.type === "User" ? [`@${namespace.login}`] : [];
  const reviewerTeams: string[] = [];

  for (const reference of unique(parsed.data)) {
    const separator = reference.indexOf("/");
    const account = reference.slice(
      1,
      separator === -1 ? undefined : separator,
    );
    const teamSlug =
      separator === -1 ? undefined : reference.slice(separator + 1);
    if (teamSlug !== undefined) {
      if (
        namespace.type !== "Organization" ||
        account.toLowerCase() !== namespace.login.toLowerCase()
      ) {
        throw new Error(
          `Code owner ${reference} must be a team in the repository organization ${namespace.login}; personal repositories cannot have team owners.`,
        );
      }
      const team = await github.getTeam(namespace.login, teamSlug);
      if (team.parent) {
        throw new Error(
          `Code owner ${reference} is a nested team. The repository Terraform module only resolves root teams for deployment reviewers; choose a root team.`,
        );
      }
      if (team.privacy === "secret") {
        throw new Error(
          `Code owner ${reference} is a secret team. Choose a visible team.`,
        );
      }
      owners.push(`@${namespace.login}/${team.slug}`);
      reviewerTeams.push(team.slug);
    } else {
      const user =
        namespace.type === "User" &&
        account.toLowerCase() === namespace.login.toLowerCase()
          ? namespace
          : await github.getAccount(account);
      if (user.type !== "User") {
        throw new Error(
          `${reference} is an organization, not an individual code owner. Use @${user.login}/team instead.`,
        );
      }
      owners.push(`@${user.login}`);
    }
  }

  if (owners.length === 0) {
    throw new Error(
      "Organization repositories require at least one code owner. Pass --code-owner @username or --code-owner @organization/team.",
    );
  }
  const resolvedReviewerTeams = unique(reviewerTeams);
  if (resolvedReviewerTeams.length > 6) {
    throw new Error(
      `GitHub environments support at most 6 deployment reviewer teams; received ${resolvedReviewerTeams.length} distinct teams. Choose at most 6 team code owners with --code-owner. Individual code owners do not count toward this limit.`,
    );
  }
  return {
    namespaceType: namespace.type,
    owners: unique(owners),
    reviewerTeams: resolvedReviewerTeams,
  };
};
