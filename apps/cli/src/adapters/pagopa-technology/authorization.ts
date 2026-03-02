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
  IdentityAlreadyExistsError,
  InvalidAuthorizationFileFormatError,
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
    const { bootstrapIdentityId, subscriptionName } = input;
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
        // Modify the file content, detecting duplicates and format errors
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
              message: `Add directory reader for ${subscriptionName}`,
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
              body: `This PR adds the bootstrap identity \`${bootstrapIdentityId}\` to the directory readers for subscription \`${subscriptionName}\`.`,
              head: branchName,
              owner: REPO_OWNER,
              repo: REPO_NAME,
              title: `Add directory reader for ${subscriptionName}`,
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
