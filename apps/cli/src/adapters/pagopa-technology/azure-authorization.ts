/**
 * PagoPA Technology Azure Authorization Adapter
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
  InvalidAuthorizationFileFormatError,
  RequestAuthorizationInput,
} from "../../domain/authorization.js";
import { GitHubService } from "../../domain/github.js";
import {
  DEFAULT_GROUP_SPECS,
  makeAzureAdGroupName,
} from "./azure-authorization-config.js";

const azureAuthorizationFileSchema = z
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
 * - Missing managed groups are added with empty members.
 * - Existing managed groups with wrong roles have their roles updated; members are preserved.
 * - Unmanaged groups are preserved unchanged.
 * Returns the updated JSON along with a flag indicating whether anything changed.
 */
const upsertGroups = (
  jsonContent: z.infer<typeof azureAuthorizationFileSchema>,
  prefix: string,
  envShort: string,
): {
  groupsChanged: boolean;
  json: z.infer<typeof azureAuthorizationFileSchema>;
} => {
  const expectedByName = new Map(
    DEFAULT_GROUP_SPECS.map((spec) => [
      makeAzureAdGroupName(prefix, envShort, spec.groupName),
      spec,
    ]),
  );

  const existingGroups = jsonContent.groups ?? [];
  const seenManagedGroups = new Set<string>();

  // Walk existing groups in their original order, updating roles where needed
  const finalGroups: typeof existingGroups = [];
  let groupsChanged = false;

  for (const existing of existingGroups) {
    const spec = expectedByName.get(existing.name);
    if (!spec) {
      // Unmanaged group — preserve as-is
      finalGroups.push(existing);
    } else {
      seenManagedGroups.add(existing.name);
      if (!rolesAreEqual(existing.roles, spec.roles)) {
        // Roles differ — update roles, preserve members and any extra fields
        finalGroups.push({ ...existing, roles: [...spec.roles] });
        groupsChanged = true;
      } else {
        finalGroups.push(existing);
      }
    }
  }

  // Append missing managed groups at the end
  for (const spec of DEFAULT_GROUP_SPECS) {
    const name = makeAzureAdGroupName(prefix, envShort, spec.groupName);
    if (!seenManagedGroups.has(name)) {
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
): Result<z.infer<typeof azureAuthorizationFileSchema>, AuthorizationError> => {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return err(
      new InvalidAuthorizationFileFormatError("File content is not valid JSON"),
    );
  }

  const result = azureAuthorizationFileSchema.safeParse(parsed);
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
  bootstrapIdentityIds: RequestAuthorizationInput["bootstrapIdentityIds"],
  identitiesChanged: boolean,
  groupsChanged: boolean,
): { body: string; message: string; title: string } => {
  const formattedIdentityIds =
    `\`${bootstrapIdentityIds.cd}\` and ` + `\`${bootstrapIdentityIds.ci}\``;

  if (identitiesChanged && groupsChanged) {
    const title = `Authorize bootstrap identities and configure AD groups for ${subscriptionName}`;
    return {
      body: `This PR ensures the bootstrap identities ${formattedIdentityIds} are directory readers and configures AD groups for subscription \`${subscriptionName}\`.`,
      message: title,
      title,
    };
  }
  if (identitiesChanged) {
    const title = `Authorize bootstrap identities for ${subscriptionName}`;
    return {
      body: `This PR ensures the bootstrap identities ${formattedIdentityIds} are directory readers for subscription \`${subscriptionName}\`.`,
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
 * Ensures the bootstrap identities are present in the service principal list.
 * Existing entries keep their first-seen order and only missing identities are
 * appended.
 */
const ensureIdentities = (
  jsonContent: z.infer<typeof azureAuthorizationFileSchema>,
  identityIds: RequestAuthorizationInput["bootstrapIdentityIds"],
): {
  identitiesChanged: boolean;
  json: z.infer<typeof azureAuthorizationFileSchema>;
} => {
  const servicePrincipalNames =
    jsonContent.directory_readers.service_principals_name;
  const uniqueIdentityIds = [...new Set(servicePrincipalNames)];
  const existingIdentityIds = new Set(uniqueIdentityIds);
  const missingIdentityIds = [identityIds.cd, identityIds.ci].filter(
    (identityId) => !existingIdentityIds.has(identityId),
  );
  const identitiesChanged =
    uniqueIdentityIds.length !== servicePrincipalNames.length ||
    missingIdentityIds.length > 0;

  if (!identitiesChanged) {
    return { identitiesChanged: false, json: jsonContent };
  }

  return {
    identitiesChanged: true,
    json: {
      ...jsonContent,
      directory_readers: {
        ...jsonContent.directory_readers,
        service_principals_name: [...uniqueIdentityIds, ...missingIdentityIds],
      },
    },
  };
};

const REPO_NAME = "eng-azure-authorization";
const BASE_BRANCH = "main";

export const makeAzureAuthorizationService = (
  gitHubService: GitHubService,
): AuthorizationService => ({
  requestAuthorization(
    input: RequestAuthorizationInput,
  ): ResultAsync<AuthorizationResult, AuthorizationError> {
    const logger = getLogger(["dx-cli", "pagopa-azure-authorization"]);
    const {
      bootstrapIdentityIds,
      envShort,
      prefix,
      repoName,
      repoOwner,
      subscriptionName,
    } = input;
    const authorizationRepoOwner = repoOwner;
    const filePath = `src/azure-subscriptions/subscriptions/${subscriptionName}/terraform.tfvars.json`;
    const branchName = `feats/add-${repoName}-${subscriptionName}-bootstrap-identity`;

    return (
      // Step 1: Read file from main to determine if changes are needed
      ResultAsync.fromPromise(
        gitHubService.getFileContent({
          owner: authorizationRepoOwner,
          path: filePath,
          ref: BASE_BRANCH,
          repo: REPO_NAME,
        }),
        () =>
          new AuthorizationError(
            `Unable to get ${filePath} in ${authorizationRepoOwner}/${REPO_NAME}`,
          ),
      )
        .orTee((error) => {
          logger.error(error.message);
        })
        // Step 2: Parse file, ensure identities, upsert groups, detect no-op
        .andThen(({ content, sha }) => {
          const parseResult = parseAuthorizationFile(content);
          if (parseResult.isErr()) {
            logger.error("Failed to modify tfvars", {
              error: parseResult.error.message,
            });
            return errAsync(parseResult.error);
          }
          const parsed = parseResult.value;

          const { identitiesChanged, json: withIdentities } = ensureIdentities(
            parsed,
            bootstrapIdentityIds,
          );
          if (!identitiesChanged) {
            logger.warn("Bootstrap identities already exist, checking groups", {
              identityIds: bootstrapIdentityIds,
              subscription: subscriptionName,
            });
          }

          const { groupsChanged, json: updatedJson } = upsertGroups(
            withIdentities,
            prefix,
            envShort,
          );

          if (!identitiesChanged && !groupsChanged) {
            // Nothing to do — no branch created, no PR needed.
            logger.info("No changes needed, skipping PR", {
              subscription: subscriptionName,
            });
            return okAsync(new AuthorizationResult());
          }

          const { body, message, title } = makeChangeDescription(
            subscriptionName,
            bootstrapIdentityIds,
            identitiesChanged,
            groupsChanged,
          );

          // Step 3: Create branch only when changes are needed
          return (
            ResultAsync.fromPromise(
              gitHubService.createBranch({
                branchName,
                fromRef: BASE_BRANCH,
                owner: authorizationRepoOwner,
                repo: REPO_NAME,
              }),
              () =>
                new AuthorizationError(
                  `Unable to create branch ${branchName} in ${authorizationRepoOwner}/${REPO_NAME}`,
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
                    owner: authorizationRepoOwner,
                    path: filePath,
                    repo: REPO_NAME,
                    sha,
                  }),
                  () =>
                    new AuthorizationError(
                      `Unable to update ${filePath} on branch ${branchName} in ${authorizationRepoOwner}/${REPO_NAME}`,
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
                    owner: authorizationRepoOwner,
                    repo: REPO_NAME,
                    title,
                  }),
                  () =>
                    new AuthorizationError(
                      `Unable to create pull request from ${branchName} to ${BASE_BRANCH} in ${authorizationRepoOwner}/${REPO_NAME}`,
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
