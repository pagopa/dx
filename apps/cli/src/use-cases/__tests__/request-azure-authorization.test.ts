import { err, ok } from "neverthrow";
import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";

import {
  FileNotFoundError,
  GitHubService,
  PullRequest,
} from "../../domain/github.js";
import {
  IdentityAlreadyExistsError,
  InvalidTfvarsFormatError,
  RequestAzureAuthorizationInput,
  requestAzureAuthorizationInputSchema,
  TfvarsService,
} from "../../domain/tfvars.js";
import { requestAzureAuthorization } from "../request-azure-authorization.js";

const makeEnv = () => {
  const gitHubService = mock<GitHubService>();
  const tfvarsService = mock<TfvarsService>();

  return {
    gitHubService,
    tfvarsService,
  };
};

const makeSampleInput = (): RequestAzureAuthorizationInput =>
  requestAzureAuthorizationInputSchema.parse({
    bootstrapIdentityId: "test-bootstrap-identity-id",
    subscriptionName: "test-subscription",
  });

// eslint-disable-next-line max-lines-per-function
describe("requestAzureAuthorization", () => {
  describe("happy path", () => {
    it("should create a pull request when all steps succeed", async () => {
      const { gitHubService, tfvarsService } = makeEnv();
      const input = makeSampleInput();
      const originalContent = `
directory_readers = {
  service_principals_name = []
}
`.trim();
      const updatedContent = `
directory_readers = {
  service_principals_name = [
    "test-bootstrap-identity-id",
  ]
}
`.trim();

      // Setup mocks
      gitHubService.getFileContent.mockResolvedValue({
        content: originalContent,
        sha: "original-sha-123",
      });
      tfvarsService.containsServicePrincipal.mockReturnValue(false);
      tfvarsService.appendToDirectoryReaders.mockReturnValue(
        ok(updatedContent),
      );
      gitHubService.createBranch.mockResolvedValue(undefined);
      gitHubService.updateFile.mockResolvedValue(undefined);
      gitHubService.createPullRequest.mockResolvedValue(
        new PullRequest(
          "https://github.com/pagopa/eng-azure-authorization/pull/42",
        ),
      );

      const result = await requestAzureAuthorization(
        gitHubService,
        tfvarsService,
      )(input);

      expect(result.isOk()).toBe(true);
      const pr = result._unsafeUnwrap();
      expect(pr.url).toBe(
        "https://github.com/pagopa/eng-azure-authorization/pull/42",
      );

      // Verify correct API calls
      expect(gitHubService.getFileContent).toHaveBeenCalledWith({
        owner: "pagopa",
        path: "src/azure-subscriptions/subscriptions/test-subscription/terraform.tfvars",
        ref: "main",
        repo: "eng-azure-authorization",
      });

      expect(tfvarsService.containsServicePrincipal).toHaveBeenCalledWith(
        originalContent,
        "test-bootstrap-identity-id",
      );

      expect(tfvarsService.appendToDirectoryReaders).toHaveBeenCalledWith(
        originalContent,
        "test-bootstrap-identity-id",
      );

      expect(gitHubService.createBranch).toHaveBeenCalledWith({
        branchName: "feats/add-test-subscription-bootstrap-identity",
        fromRef: "main",
        owner: "pagopa",
        repo: "eng-azure-authorization",
      });

      expect(gitHubService.updateFile).toHaveBeenCalledWith({
        branch: "feats/add-test-subscription-bootstrap-identity",
        content: updatedContent,
        message: "Add directory reader for test-subscription",
        owner: "pagopa",
        path: "src/azure-subscriptions/subscriptions/test-subscription/terraform.tfvars",
        repo: "eng-azure-authorization",
        sha: "original-sha-123",
      });

      expect(gitHubService.createPullRequest).toHaveBeenCalledWith({
        base: "main",
        body: "This PR adds the bootstrap identity `test-bootstrap-identity-id` to the directory readers for subscription `test-subscription`.",
        head: "feats/add-test-subscription-bootstrap-identity",
        owner: "pagopa",
        repo: "eng-azure-authorization",
        title: "Add directory reader for test-subscription",
      });
    });
  });

  describe("error handling", () => {
    it("should return error when file is not found", async () => {
      const { gitHubService, tfvarsService } = makeEnv();
      const input = makeSampleInput();

      gitHubService.getFileContent.mockRejectedValue(
        new FileNotFoundError(
          "src/azure-subscriptions/subscriptions/test-subscription/terraform.tfvars",
        ),
      );

      const result = await requestAzureAuthorization(
        gitHubService,
        tfvarsService,
      )(input);

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error.message).toContain("Unable to get");
      expect(error.message).toContain("test-subscription/terraform.tfvars");
      expect(error.cause).toBeInstanceOf(FileNotFoundError);

      // Should not proceed with other operations
      expect(tfvarsService.containsServicePrincipal).not.toHaveBeenCalled();
      expect(gitHubService.createBranch).not.toHaveBeenCalled();
    });

    it("should return error when identity already exists", async () => {
      const { gitHubService, tfvarsService } = makeEnv();
      const input = makeSampleInput();
      const content = `
directory_readers = {
  service_principals_name = [
    "test-bootstrap-identity-id",
  ]
}
`.trim();

      gitHubService.getFileContent.mockResolvedValue({
        content,
        sha: "sha-123",
      });
      tfvarsService.containsServicePrincipal.mockReturnValue(true);

      const result = await requestAzureAuthorization(
        gitHubService,
        tfvarsService,
      )(input);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(
        IdentityAlreadyExistsError,
      );

      // Should not proceed with modification or branch creation
      expect(tfvarsService.appendToDirectoryReaders).not.toHaveBeenCalled();
      expect(gitHubService.createBranch).not.toHaveBeenCalled();
    });

    it("should return error when tfvars format is invalid", async () => {
      const { gitHubService, tfvarsService } = makeEnv();
      const input = makeSampleInput();
      const invalidContent = "invalid content without directory_readers";

      gitHubService.getFileContent.mockResolvedValue({
        content: invalidContent,
        sha: "sha-123",
      });
      tfvarsService.containsServicePrincipal.mockReturnValue(false);
      tfvarsService.appendToDirectoryReaders.mockReturnValue(
        err(
          new InvalidTfvarsFormatError(
            "Could not find directory_readers.service_principals_name list",
          ),
        ),
      );

      const result = await requestAzureAuthorization(
        gitHubService,
        tfvarsService,
      )(input);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(
        InvalidTfvarsFormatError,
      );

      // Should not proceed with branch creation
      expect(gitHubService.createBranch).not.toHaveBeenCalled();
    });

    it("should return error when branch creation fails", async () => {
      const { gitHubService, tfvarsService } = makeEnv();
      const input = makeSampleInput();
      const content = `
directory_readers = {
  service_principals_name = []
}
`.trim();

      gitHubService.getFileContent.mockResolvedValue({
        content,
        sha: "sha-123",
      });
      tfvarsService.containsServicePrincipal.mockReturnValue(false);
      tfvarsService.appendToDirectoryReaders.mockReturnValue(
        ok("updated content"),
      );
      gitHubService.createBranch.mockRejectedValue(
        new Error("Failed to create branch: branch already exists"),
      );

      const result = await requestAzureAuthorization(
        gitHubService,
        tfvarsService,
      )(input);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain(
        "Unable to create branch",
      );

      // Should not proceed with file update
      expect(gitHubService.updateFile).not.toHaveBeenCalled();
    });

    it("should return error when file update fails", async () => {
      const { gitHubService, tfvarsService } = makeEnv();
      const input = makeSampleInput();
      const content = `
directory_readers = {
  service_principals_name = []
}
`.trim();

      gitHubService.getFileContent.mockResolvedValue({
        content,
        sha: "sha-123",
      });
      tfvarsService.containsServicePrincipal.mockReturnValue(false);
      tfvarsService.appendToDirectoryReaders.mockReturnValue(
        ok("updated content"),
      );
      gitHubService.createBranch.mockResolvedValue(undefined);
      gitHubService.updateFile.mockRejectedValue(
        new Error("Failed to update file: conflict"),
      );

      const result = await requestAzureAuthorization(
        gitHubService,
        tfvarsService,
      )(input);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain("Unable to update");

      // Should not proceed with PR creation
      expect(gitHubService.createPullRequest).not.toHaveBeenCalled();
    });

    it("should return error when PR creation fails", async () => {
      const { gitHubService, tfvarsService } = makeEnv();
      const input = makeSampleInput();
      const content = `
directory_readers = {
  service_principals_name = []
}
`.trim();

      gitHubService.getFileContent.mockResolvedValue({
        content,
        sha: "sha-123",
      });
      tfvarsService.containsServicePrincipal.mockReturnValue(false);
      tfvarsService.appendToDirectoryReaders.mockReturnValue(
        ok("updated content"),
      );
      gitHubService.createBranch.mockResolvedValue(undefined);
      gitHubService.updateFile.mockResolvedValue(undefined);
      gitHubService.createPullRequest.mockRejectedValue(
        new Error("Failed to create pull request"),
      );

      const result = await requestAzureAuthorization(
        gitHubService,
        tfvarsService,
      )(input);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain(
        "Unable to create pull request",
      );
    });
  });
});
