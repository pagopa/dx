/**
 * PagoPA Technology Authorization Adapter
 *
 * Implements the AuthorizationService interface for the PagoPA Azure
 * authorization workflow. Encapsulates all platform-specific details:
 * the target GitHub repository, file paths, branch naming, HCL file
 * parsing, and pull request creation.
 */

import { getLogger } from "@logtape/logtape";
import { err, errAsync, ok, okAsync, Result, ResultAsync } from "neverthrow";

import {
  AuthorizationError,
  AuthorizationResult,
  AuthorizationService,
  DEFAULT_GROUP_SPECS,
  GroupConfig,
  IdentityAlreadyExistsError,
  InvalidAuthorizationFileFormatError,
  makeGroupName,
  RequestAuthorizationInput,
} from "../../domain/authorization.js";
import { GitHubService } from "../../domain/github.js";

// Matches the service_principals_name list inside the directory_readers block.
const DIRECTORY_READERS_REGEX =
  /(directory_readers\s*=\s*\{[\s\S]*?service_principals_name\s*=\s*\[)([\s\S]*?)(][\s\S]*?})/;

const addIdentity = (
  content: string,
  identityId: string,
): Result<string, AuthorizationError> => {
  const match = content.match(DIRECTORY_READERS_REGEX);

  if (!match) {
    return err(
      new InvalidAuthorizationFileFormatError(
        "Could not find directory_readers.service_principals_name list",
      ),
    );
  }

  const [, prefix, existingItems, suffix] = match;

  if (existingItems.includes(`"${identityId}"`)) {
    return err(new IdentityAlreadyExistsError(identityId));
  }

  // Build the new list content following HCL formatting rules:
  // - Items are indented with 4 spaces; the LAST item must NOT have a trailing comma
  const newListContent =
    existingItems.trim().length > 0
      ? `${existingItems.replace(/,?\s*$/, "")},\n    "${identityId}"\n  `
      : `\n    "${identityId}"\n  `;

  return ok(
    content.replace(
      DIRECTORY_READERS_REGEX,
      `${prefix}${newListContent}${suffix}`,
    ),
  );
};

/**
 * Finds and extracts the groups list from content using bracket counting.
 */
const findGroupsList = (
  content: string,
): undefined | { content: string; end: number; start: number } => {
  const startMatch = content.match(/groups\s*=\s*\[/);
  if (!startMatch || startMatch.index === undefined) {
    return undefined;
  }

  const listStartIndex = startMatch.index + startMatch[0].length;
  let depth = 1;
  let i = listStartIndex;

  while (i < content.length && depth > 0) {
    if (content[i] === "[") {
      depth++;
    } else if (content[i] === "]") {
      depth--;
    }
    i++;
  }

  if (depth !== 0) {
    return undefined;
  }

  return {
    content: content.slice(listStartIndex, i - 1),
    end: i,
    start: startMatch.index,
  };
};

/**
 * Parses all group objects from the groups list content using bracket counting.
 */
const parseGroupObjects = (groupsContent: string): string[] => {
  const groups: string[] = [];
  let depth = 0;
  let currentGroup = "";
  let inGroup = false;

  for (const char of groupsContent) {
    if (char === "{") {
      if (depth === 0) {
        inGroup = true;
        currentGroup = "";
      }
      depth++;
      currentGroup += char;
    } else if (char === "}") {
      depth--;
      currentGroup += char;
      if (depth === 0 && inGroup) {
        groups.push(currentGroup);
        inGroup = false;
      }
    } else if (inGroup) {
      currentGroup += char;
    }
  }

  return groups;
};

/**
 * Parses a single group object from HCL format.
 */
const parseGroupObject = (groupStr: string): GroupConfig | undefined => {
  const nameMatch = groupStr.match(/name\s*=\s*"([^"]+)"/);
  const rolesMatch = groupStr.match(/roles\s*=\s*\[([\s\S]*?)]/);
  const membersMatch = groupStr.match(/members\s*=\s*\[([\s\S]*?)]/);

  if (!nameMatch) {
    return undefined;
  }

  const name = nameMatch[1];
  const roles = rolesMatch
    ? [...rolesMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
    : [];
  const members = membersMatch
    ? [...membersMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
    : [];

  return { members, name, roles };
};

/**
 * Formats a group config to HCL format.
 */
const formatGroupToHcl = (group: GroupConfig): string => {
  const membersStr =
    group.members.length > 0
      ? group.members.map((m) => `      "${m}"`).join(",\n")
      : "";

  const rolesStr = group.roles.map((r) => `      "${r}"`).join(",\n");

  const membersBlock =
    group.members.length > 0
      ? `    members = [\n${membersStr}\n    ]`
      : `    members = []`;

  return `  {
    name = "${group.name}"
${membersBlock},
    roles = [
${rolesStr}
    ]
  }`;
};

/**
 * Checks if two role arrays are equivalent (same roles, order-independent).
 */
const rolesAreEqual = (
  roles1: readonly string[],
  roles2: readonly string[],
): boolean => {
  if (roles1.length !== roles2.length) {
    return false;
  }
  const sorted1 = [...roles1].sort();
  const sorted2 = [...roles2].sort();
  return sorted1.every((role, idx) => role === sorted2[idx]);
};

/**
 * Adds or updates AD groups in the tfvars content.
 */
const upsertGroups = (
  content: string,
  prefix: string,
  envShort: string,
): Result<string, AuthorizationError> => {
  const expectedGroups: GroupConfig[] = DEFAULT_GROUP_SPECS.map((spec) => ({
    members: [],
    name: makeGroupName(prefix, envShort, spec.groupName),
    roles: [...spec.roles],
  }));

  const groupsListInfo = findGroupsList(content);

  if (!groupsListInfo) {
    // Groups list doesn't exist - create it with all default groups
    const groupsHcl = expectedGroups.map(formatGroupToHcl).join(",\n");
    const newGroupsBlock = `\ngroups = [\n${groupsHcl}\n]\n`;

    const directoryReadersMatch = content.match(DIRECTORY_READERS_REGEX);
    if (directoryReadersMatch) {
      const insertIndex =
        (directoryReadersMatch.index ?? 0) + directoryReadersMatch[0].length;
      return ok(
        content.slice(0, insertIndex) +
          newGroupsBlock +
          content.slice(insertIndex),
      );
    }

    return ok(content + newGroupsBlock);
  }

  // Parse existing groups
  const groupObjects = parseGroupObjects(groupsListInfo.content);
  const existingGroups: GroupConfig[] = groupObjects
    .map(parseGroupObject)
    .filter((g): g is GroupConfig => g !== undefined);

  const existingGroupsMap = new Map(existingGroups.map((g) => [g.name, g]));

  const finalGroups: GroupConfig[] = [];
  const processedNames = new Set<string>();

  for (const expected of expectedGroups) {
    const existing = existingGroupsMap.get(expected.name);
    processedNames.add(expected.name);

    if (!existing) {
      finalGroups.push(expected);
    } else if (!rolesAreEqual(existing.roles, expected.roles)) {
      finalGroups.push({
        members: existing.members,
        name: expected.name,
        roles: [...expected.roles],
      });
    } else {
      finalGroups.push(existing);
    }
  }

  // Preserve user-added groups
  for (const existing of existingGroups) {
    if (!processedNames.has(existing.name)) {
      finalGroups.push(existing);
    }
  }

  const groupsHcl = finalGroups.map(formatGroupToHcl).join(",\n");
  const newGroupsBlock = `groups = [\n${groupsHcl}\n]`;

  return ok(
    content.slice(0, groupsListInfo.start) +
      newGroupsBlock +
      content.slice(groupsListInfo.end),
  );
};

const REPO_OWNER = "pagopa";
const REPO_NAME = "eng-azure-authorization";
const BASE_BRANCH = "main";

export const makeAuthorizationService = (
  gitHubService: GitHubService,
): AuthorizationService => ({
  requestAuthorization(
    input: RequestAuthorizationInput,
  ): ResultAsync<AuthorizationResult, AuthorizationError> {
    const logger = getLogger(["dx-cli", "pagopa-authorization"]);
    const { bootstrapIdentityId, envShort, prefix, subscriptionName } = input;
    const filePath = `src/azure-subscriptions/subscriptions/${subscriptionName}/terraform.tfvars`;
    const branchName = `feats/add-${subscriptionName}-bootstrap-identity`;

    return (
      // Step 1: Create branch first to avoid race condition with main branch updates
      ResultAsync.fromPromise(
        gitHubService.createBranch({
          branchName,
          fromRef: BASE_BRANCH,
          owner: REPO_OWNER,
          repo: REPO_NAME,
        }),
        () =>
          new AuthorizationError(
            `Unable to create branch ${branchName} in ${REPO_OWNER}/${REPO_NAME}`,
          ),
      )
        .orTee((error) => {
          logger.error(error.message);
        })
        // Step 2: Fetch file content from the newly created branch
        .andThen(() =>
          ResultAsync.fromPromise(
            gitHubService.getFileContent({
              owner: REPO_OWNER,
              path: filePath,
              ref: branchName,
              repo: REPO_NAME,
            }),
            () =>
              new AuthorizationError(
                `Unable to get ${filePath} in ${REPO_OWNER}/${REPO_NAME}`,
              ),
          ),
        )
        .orTee((error) => {
          logger.error(error.message);
        })
        // Step 3: Add identity and upsert AD groups
        .andThen(({ content, sha }) =>
          addIdentity(content, bootstrapIdentityId)
            .mapErr((error) => {
              if (error instanceof IdentityAlreadyExistsError) {
                logger.warn("Identity already exists", {
                  identityId: bootstrapIdentityId,
                  subscription: subscriptionName,
                });
              } else {
                logger.error("Failed to modify tfvars", {
                  error: error.message,
                });
              }
              return error;
            })
            .andThen((contentWithIdentity) =>
              upsertGroups(contentWithIdentity, prefix, envShort).mapErr(
                (error) => {
                  logger.error("Failed to upsert groups", {
                    error: error.message,
                  });
                  return error;
                },
              ),
            )
            .match(
              (updatedContent) => okAsync({ sha, updatedContent }),
              (error) => errAsync(error),
            ),
        )
        // Update the file on the new branch
        .andThen(({ sha, updatedContent }) =>
          ResultAsync.fromPromise(
            gitHubService.updateFile({
              branch: branchName,
              content: updatedContent,
              message: `Add bootstrap identity and AD groups for ${subscriptionName}`,
              owner: REPO_OWNER,
              path: filePath,
              repo: REPO_NAME,
              sha,
            }),
            () =>
              new AuthorizationError(
                `Unable to update ${filePath} on branch ${branchName} in ${REPO_OWNER}/${REPO_NAME}`,
              ),
          ),
        )
        .orTee((error) => {
          logger.error(error.message);
        })
        // Create a pull request for review
        .andThen(() =>
          ResultAsync.fromPromise(
            gitHubService.createPullRequest({
              base: BASE_BRANCH,
              body: `This PR adds the bootstrap identity \`${bootstrapIdentityId}\` to the directory readers and configures AD groups for subscription \`${subscriptionName}\`.`,
              head: branchName,
              owner: REPO_OWNER,
              repo: REPO_NAME,
              title: `Add bootstrap identity and AD groups for ${subscriptionName}`,
            }),
            () =>
              new AuthorizationError(
                `Unable to create pull request from ${branchName} to ${BASE_BRANCH} in ${REPO_OWNER}/${REPO_NAME}`,
              ),
          ),
        )
        .orTee((error) => {
          logger.error(error.message);
        })
        .map((pr) => new AuthorizationResult(pr.url))
    );
  },
});
