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
        (error) => error as Error,
      )
        // Check for duplicate and modify content
        .andThen(({ content, sha }) => {
          // Check if identity already exists
          if (
            tfvarsService.containsServicePrincipal(content, bootstrapIdentityId)
          ) {
            return errAsync(
              new IdentityAlreadyExistsError(bootstrapIdentityId),
            );
          }

          // Modify the content
          const modifyResult = tfvarsService.appendToDirectoryReaders(
            content,
            bootstrapIdentityId,
          );

          if (modifyResult.isErr()) {
            return errAsync(modifyResult.error);
          }

          return okAsync({ sha, updatedContent: modifyResult.value });
        })
        // Create branch
        .andThen(({ sha, updatedContent }) =>
          ResultAsync.fromPromise(
            gitHubService.createBranch({
              branchName,
              fromRef: BASE_BRANCH,
              owner: REPO_OWNER,
              repo: REPO_NAME,
            }),
            (error) => error as Error,
          ).map(() => ({ sha, updatedContent })),
        )
        // Update file on the new branch
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
            (error) => error as Error,
          ),
        )
        // Create pull request
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
            (error) => error as Error,
          ),
        )
    );
  };
