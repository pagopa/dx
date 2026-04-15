/**
 * PagoPA Technology Authorization Adapter
 *
 * Implements the AuthorizationService interface for the PagoPA Azure
 * authorization workflow. Encapsulates all platform-specific details:
 * the target GitHub repository, file paths, branch naming, JSON file
 * parsing, and pull request creation.
 */

import { getLogger } from "@logtape/logtape";
import { err, errAsync, ok, okAsync, Result, ResultAsync } from "neverthrow";
import { z } from "zod";

import {
  AuthorizationError,
  AuthorizationResult,
  AuthorizationService,
  DEFAULT_GROUP_SPECS,
  InvalidAuthorizationFileFormatError,
  makeGroupName,
  RequestAuthorizationInput,
} from "../../domain/authorization.js";
import { GitHubService } from "../../domain/github.js";

const authorizationFileSchema = z
  .object({
    directory_readers: z
      .object({
        service_principals_name: z.array(z.string()),
      })
      .loose(),
    groups: z
      .array(
        z.object({
          members: z.array(z.string()),
          name: z.string(),
          roles: z.array(z.string()),
        }),
      )
      .optional(),
  })
  .loose();

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
 * Adds or updates the AD groups array in the parsed authorization JSON.
 * - Missing default groups are added with empty members.
 * - Existing groups with wrong roles have their roles updated; members are preserved.
 * - Custom (non-default) groups are preserved unchanged.
 * Returns the updated JSON along with a flag indicating whether anything changed.
 */
const upsertGroups = (
  jsonContent: z.infer<typeof authorizationFileSchema>,
  prefix: string,
  envShort: string,
): {
  groupsChanged: boolean;
  json: z.infer<typeof authorizationFileSchema>;
} => {
  type GroupEntry = { members: string[]; name: string; roles: string[] };

  const expectedGroups: GroupEntry[] = DEFAULT_GROUP_SPECS.map((spec) => ({
    members: [],
    name: makeGroupName(prefix, envShort, spec.groupName),
    roles: [...spec.roles],
  }));

  const existingGroups = jsonContent.groups ?? [];
  const existingByName = new Map(
    existingGroups.map((group) => [group.name, group]),
  );
  const processedNames = new Set<string>();

  const finalGroups: GroupEntry[] = [];
  let groupsChanged = false;

  for (const expected of expectedGroups) {
    const existing = existingByName.get(expected.name);
    processedNames.add(expected.name);

    if (!existing) {
      // Group is missing — add it with default roles and no members
      finalGroups.push(expected);
      groupsChanged = true;
    } else if (!rolesAreEqual(existing.roles, expected.roles)) {
      // Roles differ — update roles, preserve members
      finalGroups.push({
        members: [...existing.members],
        name: expected.name,
        roles: [...expected.roles],
      });
      groupsChanged = true;
    } else {
      // Already correct — keep as-is
      finalGroups.push({ ...existing });
    }
  }

  // Preserve any custom groups not in the default list
  for (const existing of existingGroups) {
    if (!processedNames.has(existing.name)) {
      finalGroups.push({ ...existing });
    }
  }

  return { groupsChanged, json: { ...jsonContent, groups: finalGroups } };
};

/**
 * Parses and validates the authorization file content (JSON parsing + schema validation).
 */
const parseAuthorizationFile = (
  content: string,
): Result<z.infer<typeof authorizationFileSchema>, AuthorizationError> => {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return err(
      new InvalidAuthorizationFileFormatError("File content is not valid JSON"),
    );
  }

  const result = authorizationFileSchema.safeParse(parsed);
  if (!result.success) {
    return err(
      new InvalidAuthorizationFileFormatError(
        "Could not find directory_readers.service_principals_name list",
      ),
    );
  }

  return ok(result.data);
};

/**
 * Ensures the given identity is present in the service_principals_name list.
 * Returns the (possibly updated) JSON and whether the identity was newly added.
 * Never fails: if the identity already exists it is a no-op with identityAdded = false.
 */
const ensureIdentity = (
  jsonContent: z.infer<typeof authorizationFileSchema>,
  identityId: string,
): {
  identityAdded: boolean;
  json: z.infer<typeof authorizationFileSchema>;
} => {
  if (
    jsonContent.directory_readers.service_principals_name.includes(identityId)
  ) {
    return { identityAdded: false, json: jsonContent };
  }

  return {
    identityAdded: true,
    json: {
      ...jsonContent,
      directory_readers: {
        ...jsonContent.directory_readers,
        service_principals_name: [
          ...jsonContent.directory_readers.service_principals_name,
          identityId,
        ],
      },
    },
  };
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
    const {
      bootstrapIdentityId,
      envShort,
      prefix,
      repoName,
      subscriptionName,
    } = input;
    const filePath = `src/azure-subscriptions/subscriptions/${subscriptionName}/terraform.tfvars.json`;
    const branchName = `feats/add-${repoName}-${subscriptionName}-bootstrap-identity`;

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
        // Step 3: Parse file, ensure identity is present, upsert AD groups.
        // If nothing changed, short-circuit and skip the file update and PR creation.
        .andThen(({ content, sha }) => {
          const parseResult = parseAuthorizationFile(content);
          if (parseResult.isErr()) {
            logger.error("Failed to modify tfvars", {
              error: parseResult.error.message,
            });
            return errAsync(parseResult.error);
          }
          const parsed = parseResult.value;

          const { identityAdded, json: withIdentity } = ensureIdentity(
            parsed,
            bootstrapIdentityId,
          );
          if (!identityAdded) {
            logger.warn("Identity already exists, checking groups", {
              identityId: bootstrapIdentityId,
              subscription: subscriptionName,
            });
          }

          const { groupsChanged, json: updatedJson } = upsertGroups(
            withIdentity,
            prefix,
            envShort,
          );

          if (!identityAdded && !groupsChanged) {
            // Nothing to do — identity was already present and all groups are correct.
            logger.info("No changes needed, skipping PR", {
              subscription: subscriptionName,
            });
            return okAsync(new AuthorizationResult());
          }

          return ResultAsync.fromPromise(
            gitHubService.updateFile({
              branch: branchName,
              content: JSON.stringify(updatedJson, null, 2),
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
          )
            .orTee((error) => {
              logger.error(error.message);
            })
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
            .map((pr) => new AuthorizationResult(pr.url));
        })
    );
  },
});
