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
    repoName: "test-repo",
    subscriptionName: "test-subscription",
  });

const FILE_PATH =
  "src/azure-subscriptions/subscriptions/test-subscription/terraform.tfvars.json";

// eslint-disable-next-line max-lines-per-function
describe("PagoPA AuthorizationService", () => {
  describe("happy path", () => {
    it("should create a pull request when all steps succeed", async () => {
      const { authorizationService, gitHubService } = makeEnv();
      const input = makeSampleInput();
      const originalContent = JSON.stringify(
        { directory_readers: { service_principals_name: [] } },
        null,
        2,
      );

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
        branchName: "feats/add-test-repo-test-subscription-bootstrap-identity",
        fromRef: "main",
        owner: "pagopa",
        repo: "eng-azure-authorization",
      });

      expect(gitHubService.getFileContent).toHaveBeenCalledWith({
        owner: "pagopa",
        path: FILE_PATH,
        ref: "feats/add-test-repo-test-subscription-bootstrap-identity",
        repo: "eng-azure-authorization",
      });

      expect(gitHubService.updateFile).toHaveBeenCalledWith(
        expect.objectContaining({
          branch: "feats/add-test-repo-test-subscription-bootstrap-identity",
          message: "Add directory reader for test-subscription",
          owner: "pagopa",
          path: FILE_PATH,
          repo: "eng-azure-authorization",
          sha: "original-sha-123",
        }),
      );

      expect(gitHubService.createPullRequest).toHaveBeenCalledWith({
        base: "main",
        body: "This PR adds the bootstrap identity `test-bootstrap-identity-id` to the directory readers for subscription `test-subscription`.",
        head: "feats/add-test-repo-test-subscription-bootstrap-identity",
        owner: "pagopa",
        repo: "eng-azure-authorization",
        title: "Add directory reader for test-subscription",
      });
    });

    it("should preserve existing fields in the JSON file", async () => {
      const { authorizationService, gitHubService } = makeEnv();
      const input = makeSampleInput();
      const originalContent = JSON.stringify(
        {
          directory_readers: {
            service_principals_name: ["existing-identity"],
            some_other_field: "keep-me",
          },
          entra_groups: {
            readers: ["reader-group"],
          },
          other_top_level: true,
        },
        null,
        2,
      );

      gitHubService.createBranch.mockResolvedValue(undefined);
      gitHubService.getFileContent.mockResolvedValue({
        content: originalContent,
        sha: "sha-789",
      });
      gitHubService.updateFile.mockResolvedValue(undefined);
      gitHubService.createPullRequest.mockResolvedValue(
        new PullRequest(
          "https://github.com/pagopa/eng-azure-authorization/pull/44",
        ),
      );

      const result = await authorizationService.requestAuthorization(input);

      expect(result.isOk()).toBe(true);

      const updateCall = gitHubService.updateFile.mock.calls[0][0];
      const updatedParsed = JSON.parse(updateCall.content);

      // New identity was added
      expect(updatedParsed.directory_readers.service_principals_name).toContain(
        "test-bootstrap-identity-id",
      );
      // Existing identity preserved
      expect(updatedParsed.directory_readers.service_principals_name).toContain(
        "existing-identity",
      );
      // Extra nested field preserved
      expect(updatedParsed.directory_readers.some_other_field).toBe("keep-me");
      // Other top-level objects preserved
      expect(updatedParsed.entra_groups).toEqual({ readers: ["reader-group"] });
      expect(updatedParsed.other_top_level).toBe(true);
    });

    it("should append identity to an existing non-empty list", async () => {
      const { authorizationService, gitHubService } = makeEnv();
      const input = makeSampleInput();
      const originalContent = JSON.stringify(
        {
          directory_readers: {
            service_principals_name: ["existing-identity"],
          },
        },
        null,
        2,
      );

      gitHubService.createBranch.mockResolvedValue(undefined);
      gitHubService.getFileContent.mockResolvedValue({
        content: originalContent,
        sha: "sha-456",
      });
      gitHubService.updateFile.mockResolvedValue(undefined);
      gitHubService.createPullRequest.mockResolvedValue(
        new PullRequest(
          "https://github.com/pagopa/eng-azure-authorization/pull/43",
        ),
      );

      const result = await authorizationService.requestAuthorization(input);

      expect(result.isOk()).toBe(true);

      const updateCall = gitHubService.updateFile.mock.calls[0][0];
      const updatedParsed = JSON.parse(updateCall.content);
      expect(updatedParsed.directory_readers.service_principals_name).toContain(
        "test-bootstrap-identity-id",
      );
      expect(updatedParsed.directory_readers.service_principals_name).toContain(
        "existing-identity",
      );
    });
  });

  describe("error handling", () => {
    it("should return error when file is not found", async () => {
      const { authorizationService, gitHubService } = makeEnv();
      const input = makeSampleInput();

      gitHubService.createBranch.mockResolvedValue(undefined);
      gitHubService.getFileContent.mockRejectedValue(
        new FileNotFoundError(FILE_PATH),
      );

      const result = await authorizationService.requestAuthorization(input);

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error.message).toContain("Unable to get");
      expect(error.message).toContain("terraform.tfvars.json");

      expect(gitHubService.updateFile).not.toHaveBeenCalled();
    });

    it("should return error when identity already exists", async () => {
      const { authorizationService, gitHubService } = makeEnv();
      const input = makeSampleInput();
      const content = JSON.stringify(
        {
          directory_readers: {
            service_principals_name: ["test-bootstrap-identity-id"],
          },
        },
        null,
        2,
      );

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

    it("should return error when file content is not valid JSON", async () => {
      const { authorizationService, gitHubService } = makeEnv();
      const input = makeSampleInput();

      gitHubService.createBranch.mockResolvedValue(undefined);
      gitHubService.getFileContent.mockResolvedValue({
        content: "not valid json {{",
        sha: "sha-123",
      });

      const result = await authorizationService.requestAuthorization(input);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(
        InvalidAuthorizationFileFormatError,
      );

      expect(gitHubService.updateFile).not.toHaveBeenCalled();
    });

    it("should return error when JSON is missing expected keys", async () => {
      const { authorizationService, gitHubService } = makeEnv();
      const input = makeSampleInput();

      gitHubService.createBranch.mockResolvedValue(undefined);
      gitHubService.getFileContent.mockResolvedValue({
        content: JSON.stringify({ unexpected_key: {} }),
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
      const content = JSON.stringify(
        { directory_readers: { service_principals_name: [] } },
        null,
        2,
      );

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
      const content = JSON.stringify(
        { directory_readers: { service_principals_name: [] } },
        null,
        2,
      );

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
