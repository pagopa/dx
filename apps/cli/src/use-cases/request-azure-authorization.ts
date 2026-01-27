import { getLogger } from "@logtape/logtape";
import { errAsync, okAsync, ResultAsync } from "neverthrow";

import { GitHubService, PullRequest } from "../domain/github.js";
import {
  IdentityAlreadyExistsError,
  RequestAzureAuthorizationInput,
  TfvarsService,
} from "../domain/tfvars.js";

const REPO_OWNER = "pagopa";
const REPO_NAME = "eng-azure-authorization";
const BASE_BRANCH = "main";

/**
 * Creates a pull request to add a bootstrap identity to the Azure authorization repository.
 *
 * This use case:
 * 1. Fetches the terraform.tfvars file for the given subscription
 * 2. Checks if the identity already exists (returns error if so)
 * 3. Appends the bootstrap identity to the directory_readers.service_principals_name list
 * 4. Creates a new branch
 * 5. Updates the file on the new branch
 * 6. Creates a pull request
 *
 * @param gitHubService - The GitHub service for API operations
 * @param tfvarsService - The service for manipulating tfvars content
 * @returns A function that takes input and returns a ResultAsync with the created PullRequest
 */
export const requestAzureAuthorization =
  (gitHubService: GitHubService, tfvarsService: TfvarsService) =>
  (input: RequestAzureAuthorizationInput): ResultAsync<PullRequest, Error> => {
    const logger = getLogger(["dx-cli", "azure-auth"]);
    const { bootstrapIdentityId, subscriptionName } = input;
    const filePath = `src/azure-subscriptions/subscriptions/${subscriptionName}/terraform.tfvars`;
    const branchName = `feats/add-${subscriptionName}-bootstrap-identity`;

    return (
      ResultAsync.fromPromise(
        gitHubService.getFileContent({
          owner: REPO_OWNER,
          path: filePath,
          ref: BASE_BRANCH,
          repo: REPO_NAME,
        }),
        (cause) =>
          new Error(`Unable to get ${filePath} in ${REPO_OWNER}/${REPO_NAME}`, {
            cause,
          }),
      )
        .orTee((error) => {
          logger.error(error.message);
        })
        // Check for duplicates and modify the file content
        .andThen(({ content, sha }) => {
          // Verify the identity doesn't already exist to prevent duplicates
          if (
            tfvarsService.containsServicePrincipal(content, bootstrapIdentityId)
          ) {
            logger.warn("Identity already exists", {
              identityId: bootstrapIdentityId,
              subscription: subscriptionName,
            });
            return errAsync(
              new IdentityAlreadyExistsError(bootstrapIdentityId),
            );
          }

          const modifyResult = tfvarsService.appendToDirectoryReaders(
            content,
            bootstrapIdentityId,
          );

          if (modifyResult.isErr()) {
            logger.error("Failed to modify tfvars", {
              error: modifyResult.error.message,
            });
            return errAsync(modifyResult.error);
          }

          // Return both the file SHA (needed for update) and the updated content
          return okAsync({ sha, updatedContent: modifyResult.value });
        })
        .andThen(
          ({ sha, updatedContent }) =>
            ResultAsync.fromPromise(
              gitHubService.createBranch({
                branchName,
                fromRef: BASE_BRANCH,
                owner: REPO_OWNER,
                repo: REPO_NAME,
              }),
              (cause) =>
                new Error(
                  `Unable to create branch ${branchName} in ${REPO_OWNER}/${REPO_NAME}`,
                  { cause },
                ),
            ).map(() => ({ sha, updatedContent })), // Pass along sha and content to next step
        )
        .orTee((error) => {
          logger.error(error.message);
        })
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
              sha, // Required by GitHub API to prevent conflicts
            }),
            (cause) =>
              new Error(
                `Unable to update ${filePath} on branch ${branchName} in ${REPO_OWNER}/${REPO_NAME}`,
                { cause },
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
            (cause) =>
              new Error(
                `Unable to create pull request from ${branchName} to ${BASE_BRANCH} in ${REPO_OWNER}/${REPO_NAME}`,
                { cause },
              ),
          ),
        )
        .orTee((error) => {
          logger.error(error.message);
        })
    );
  };
