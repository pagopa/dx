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
        z
          .object({
            members: z.array(z.string()),
            name: z.string(),
            roles: z.array(z.string()),
          })
          .loose(),
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
  const expectedByName = new Map(
    DEFAULT_GROUP_SPECS.map((spec) => [
      makeGroupName(prefix, envShort, spec.groupName),
      spec,
    ]),
  );

  const existingGroups = jsonContent.groups ?? [];
  const seenDefaults = new Set<string>();

  // Walk existing groups in their original order, updating roles where needed
  const finalGroups: typeof existingGroups = [];
  let groupsChanged = false;

  for (const existing of existingGroups) {
    const spec = expectedByName.get(existing.name);
    if (!spec) {
      // Custom group — preserve as-is
      finalGroups.push(existing);
    } else {
      seenDefaults.add(existing.name);
      if (!rolesAreEqual(existing.roles, spec.roles)) {
        // Roles differ — update roles, preserve members and any extra fields
        finalGroups.push({ ...existing, roles: [...spec.roles] });
        groupsChanged = true;
      } else {
        finalGroups.push(existing);
      }
    }
  }

  // Append missing default groups at the end
  for (const spec of DEFAULT_GROUP_SPECS) {
    const name = makeGroupName(prefix, envShort, spec.groupName);
    if (!seenDefaults.has(name)) {
      finalGroups.push({ members: [], name, roles: [...spec.roles] });
      groupsChanged = true;
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
 * Produces commit message, PR title, and PR body tailored to what actually changed.
 */
const makeChangeDescription = (
  subscriptionName: string,
  bootstrapIdentityId: string,
  identityAdded: boolean,
  groupsChanged: boolean,
): { body: string; message: string; title: string } => {
  if (identityAdded && groupsChanged) {
    const title = `Add bootstrap identity and AD groups for ${subscriptionName}`;
    return {
      body: `This PR adds the bootstrap identity \`${bootstrapIdentityId}\` to the directory readers and configures AD groups for subscription \`${subscriptionName}\`.`,
      message: title,
      title,
    };
  }
  if (identityAdded) {
    const title = `Add bootstrap identity for ${subscriptionName}`;
    return {
      body: `This PR adds the bootstrap identity \`${bootstrapIdentityId}\` to the directory readers for subscription \`${subscriptionName}\`.`,
      message: title,
      title,
    };
  }
  const title = `Configure AD groups for ${subscriptionName}`;
  return {
    body: `This PR configures AD groups for subscription \`${subscriptionName}\`.`,
    message: title,
    title,
  };
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
      // Step 1: Read file from main to determine if changes are needed
      ResultAsync.fromPromise(
        gitHubService.getFileContent({
          owner: REPO_OWNER,
          path: filePath,
          ref: BASE_BRANCH,
          repo: REPO_NAME,
        }),
        () =>
          new AuthorizationError(
            `Unable to get ${filePath} in ${REPO_OWNER}/${REPO_NAME}`,
          ),
      )
        .orTee((error) => {
          logger.error(error.message);
        })
        // Step 2: Parse file, ensure identity, upsert groups, detect no-op
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
            // Nothing to do — no branch created, no PR needed.
            logger.info("No changes needed, skipping PR", {
              subscription: subscriptionName,
            });
            return okAsync(new AuthorizationResult());
          }

          const { body, message, title } = makeChangeDescription(
            subscriptionName,
            bootstrapIdentityId,
            identityAdded,
            groupsChanged,
          );

          // Step 3: Create branch only when changes are needed
          return (
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
              // Step 4: Update file on the branch using the SHA read from main
              .andThen(() =>
                ResultAsync.fromPromise(
                  gitHubService.updateFile({
                    branch: branchName,
                    content: JSON.stringify(updatedJson, null, 2),
                    message,
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
              // Step 5: Create PR
              .andThen(() =>
                ResultAsync.fromPromise(
                  gitHubService.createPullRequest({
                    base: BASE_BRANCH,
                    body,
                    head: branchName,
                    owner: REPO_OWNER,
                    repo: REPO_NAME,
                    title,
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
        })
    );
  },
});
