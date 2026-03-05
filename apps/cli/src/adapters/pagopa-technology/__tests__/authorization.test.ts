/**
 * Tests for the PagoPA technology authorization adapter.
 */

import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";

import {
  AuthorizationResult,
  IdentityAlreadyExistsError,
  InvalidAuthorizationFileFormatError,
  RequestAuthorizationInput,
  requestAuthorizationInputSchema,
} from "../../../domain/authorization.js";
import {
  FileNotFoundError,
  GitHubService,
  PullRequest,
} from "../../../domain/github.js";
import { makeAuthorizationService } from "../authorization.js";

const makeEnv = () => {
  const gitHubService = mock<GitHubService>();
  const authorizationService = makeAuthorizationService(gitHubService);

  return {
    authorizationService,
    gitHubService,
  };
};

const makeSampleInput = (): RequestAuthorizationInput =>
  requestAuthorizationInputSchema.parse({
    bootstrapIdentityId: "test-bootstrap-identity-id",
    subscriptionName: "test-subscription",
  });

// eslint-disable-next-line max-lines-per-function
describe("PagoPA AuthorizationService", () => {
  describe("happy path", () => {
    it("should create a pull request when all steps succeed", async () => {
      const { authorizationService, gitHubService } = makeEnv();
      const input = makeSampleInput();
      const originalContent = `
directory_readers = {
  service_principals_name = []
}
`.trim();

      gitHubService.createBranch.mockResolvedValue(undefined);
      gitHubService.getFileContent.mockResolvedValue({
        content: originalContent,
        sha: "original-sha-123",
      });
      gitHubService.updateFile.mockResolvedValue(undefined);
      gitHubService.createPullRequest.mockResolvedValue(
        new PullRequest(
          "https://github.com/pagopa/eng-azure-authorization/pull/42",
        ),
      );

      const result = await authorizationService.requestAuthorization(input);

      expect(result.isOk()).toBe(true);
      const authResult = result._unsafeUnwrap();
      expect(authResult).toBeInstanceOf(AuthorizationResult);
      expect(authResult.url).toBe(
        "https://github.com/pagopa/eng-azure-authorization/pull/42",
      );

      expect(gitHubService.createBranch).toHaveBeenCalledWith({
        branchName: "feats/add-test-subscription-bootstrap-identity",
        fromRef: "main",
        owner: "pagopa",
        repo: "eng-azure-authorization",
      });

      expect(gitHubService.getFileContent).toHaveBeenCalledWith({
        owner: "pagopa",
        path: "src/azure-subscriptions/subscriptions/test-subscription/terraform.tfvars",
        ref: "feats/add-test-subscription-bootstrap-identity",
        repo: "eng-azure-authorization",
      });

      expect(gitHubService.updateFile).toHaveBeenCalledWith(
        expect.objectContaining({
          branch: "feats/add-test-subscription-bootstrap-identity",
          message: "Add directory reader for test-subscription",
          owner: "pagopa",
          path: "src/azure-subscriptions/subscriptions/test-subscription/terraform.tfvars",
          repo: "eng-azure-authorization",
          sha: "original-sha-123",
        }),
      );

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
      const { authorizationService, gitHubService } = makeEnv();
      const input = makeSampleInput();

      gitHubService.createBranch.mockResolvedValue(undefined);
      gitHubService.getFileContent.mockRejectedValue(
        new FileNotFoundError(
          "src/azure-subscriptions/subscriptions/test-subscription/terraform.tfvars",
        ),
      );

      const result = await authorizationService.requestAuthorization(input);

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error.message).toContain("Unable to get");
      expect(error.message).toContain("test-subscription/terraform.tfvars");

      expect(gitHubService.updateFile).not.toHaveBeenCalled();
    });

    it("should return error when identity already exists", async () => {
      const { authorizationService, gitHubService } = makeEnv();
      const input = makeSampleInput();
      const content = `
directory_readers = {
  service_principals_name = [
    "test-bootstrap-identity-id"
  ]
}
`.trim();

      gitHubService.createBranch.mockResolvedValue(undefined);
      gitHubService.getFileContent.mockResolvedValue({
        content,
        sha: "sha-123",
      });

      const result = await authorizationService.requestAuthorization(input);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(
        IdentityAlreadyExistsError,
      );

      expect(gitHubService.updateFile).not.toHaveBeenCalled();
    });

    it("should return error when tfvars format is invalid", async () => {
      const { authorizationService, gitHubService } = makeEnv();
      const input = makeSampleInput();
      const invalidContent = "invalid content without directory_readers";

      gitHubService.createBranch.mockResolvedValue(undefined);
      gitHubService.getFileContent.mockResolvedValue({
        content: invalidContent,
        sha: "sha-123",
      });

      const result = await authorizationService.requestAuthorization(input);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(
        InvalidAuthorizationFileFormatError,
      );

      expect(gitHubService.updateFile).not.toHaveBeenCalled();
    });

    it("should return error when branch creation fails", async () => {
      const { authorizationService, gitHubService } = makeEnv();
      const input = makeSampleInput();

      gitHubService.createBranch.mockRejectedValue(
        new Error("Failed to create branch: branch already exists"),
      );

      const result = await authorizationService.requestAuthorization(input);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain(
        "Unable to create branch",
      );

      expect(gitHubService.getFileContent).not.toHaveBeenCalled();
      expect(gitHubService.updateFile).not.toHaveBeenCalled();
    });

    it("should return error when file update fails", async () => {
      const { authorizationService, gitHubService } = makeEnv();
      const input = makeSampleInput();
      const content = `
directory_readers = {
  service_principals_name = []
}
`.trim();

      gitHubService.createBranch.mockResolvedValue(undefined);
      gitHubService.getFileContent.mockResolvedValue({
        content,
        sha: "sha-123",
      });
      gitHubService.updateFile.mockRejectedValue(
        new Error("Failed to update file: conflict"),
      );

      const result = await authorizationService.requestAuthorization(input);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain("Unable to update");

      expect(gitHubService.createPullRequest).not.toHaveBeenCalled();
    });

    it("should return error when PR creation fails", async () => {
      const { authorizationService, gitHubService } = makeEnv();
      const input = makeSampleInput();
      const content = `
directory_readers = {
  service_principals_name = []
}
`.trim();

      gitHubService.createBranch.mockResolvedValue(undefined);
      gitHubService.getFileContent.mockResolvedValue({
        content,
        sha: "sha-123",
      });
      gitHubService.updateFile.mockResolvedValue(undefined);
      gitHubService.createPullRequest.mockRejectedValue(
        new Error("Failed to create pull request"),
      );

      const result = await authorizationService.requestAuthorization(input);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain(
        "Unable to create pull request",
      );
    });
  });
});
