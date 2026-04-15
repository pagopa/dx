/**
 * Tests for the PagoPA technology authorization adapter.
 */

import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";

import {
  AuthorizationResult,
  DEFAULT_GROUP_SPECS,
  InvalidAuthorizationFileFormatError,
  makeGroupName,
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
    envShort: "d",
    prefix: "test",
    repoName: "test-repo",
    subscriptionName: "test-subscription",
  });

const FILE_PATH =
  "src/azure-subscriptions/subscriptions/test-subscription/terraform.tfvars.json";

// eslint-disable-next-line max-lines-per-function
describe("PagoPA AuthorizationService", () => {
  // eslint-disable-next-line max-lines-per-function
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
          message: "Add bootstrap identity and AD groups for test-subscription",
          owner: "pagopa",
          path: FILE_PATH,
          repo: "eng-azure-authorization",
          sha: "original-sha-123",
        }),
      );

      expect(gitHubService.createPullRequest).toHaveBeenCalledWith({
        base: "main",
        body: "This PR adds the bootstrap identity `test-bootstrap-identity-id` to the directory readers and configures AD groups for subscription `test-subscription`.",
        head: "feats/add-test-repo-test-subscription-bootstrap-identity",
        owner: "pagopa",
        repo: "eng-azure-authorization",
        title: "Add bootstrap identity and AD groups for test-subscription",
      });
    });

    it("should add all default AD groups when none exist", async () => {
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
        sha: "sha-groups-1",
      });
      gitHubService.updateFile.mockResolvedValue(undefined);
      gitHubService.createPullRequest.mockResolvedValue(
        new PullRequest(
          "https://github.com/pagopa/eng-azure-authorization/pull/50",
        ),
      );

      const result = await authorizationService.requestAuthorization(input);

      expect(result.isOk()).toBe(true);
      const updateCall = gitHubService.updateFile.mock.calls[0][0];
      const updatedParsed = JSON.parse(updateCall.content);

      expect(updatedParsed.groups).toHaveLength(DEFAULT_GROUP_SPECS.length);
      for (const spec of DEFAULT_GROUP_SPECS) {
        const groupName = makeGroupName("test", "d", spec.groupName);
        const found = updatedParsed.groups.find(
          (g: { name: string }) => g.name === groupName,
        );
        expect(found).toBeDefined();
        expect(found.roles).toEqual(spec.roles);
        expect(found.members).toEqual([]);
      }
    });

    it("should preserve existing members and add missing groups", async () => {
      const { authorizationService, gitHubService } = makeEnv();
      const input = makeSampleInput();
      const originalContent = JSON.stringify(
        {
          directory_readers: { service_principals_name: [] },
          groups: [
            {
              members: ["alice@pagopa.it"],
              name: "test-d-adgroup-admin",
              roles: ["Owner"],
            },
          ],
        },
        null,
        2,
      );

      gitHubService.createBranch.mockResolvedValue(undefined);
      gitHubService.getFileContent.mockResolvedValue({
        content: originalContent,
        sha: "sha-groups-2",
      });
      gitHubService.updateFile.mockResolvedValue(undefined);
      gitHubService.createPullRequest.mockResolvedValue(
        new PullRequest(
          "https://github.com/pagopa/eng-azure-authorization/pull/51",
        ),
      );

      const result = await authorizationService.requestAuthorization(input);

      expect(result.isOk()).toBe(true);
      const updateCall = gitHubService.updateFile.mock.calls[0][0];
      const updatedParsed = JSON.parse(updateCall.content);

      // All default groups should be present
      expect(updatedParsed.groups).toHaveLength(DEFAULT_GROUP_SPECS.length);

      // Admin group should preserve existing member
      const adminGroup = updatedParsed.groups.find(
        (g: { name: string }) => g.name === "test-d-adgroup-admin",
      );
      expect(adminGroup.members).toContain("alice@pagopa.it");
    });

    it("should update roles on existing group while preserving members", async () => {
      const { authorizationService, gitHubService } = makeEnv();
      const input = makeSampleInput();
      const originalContent = JSON.stringify(
        {
          directory_readers: { service_principals_name: [] },
          groups: [
            {
              // externals normally gets "Owner" but file has "Reader"
              members: ["bob@pagopa.it"],
              name: "test-d-adgroup-externals",
              roles: ["Reader"],
            },
          ],
        },
        null,
        2,
      );

      gitHubService.createBranch.mockResolvedValue(undefined);
      gitHubService.getFileContent.mockResolvedValue({
        content: originalContent,
        sha: "sha-groups-3",
      });
      gitHubService.updateFile.mockResolvedValue(undefined);
      gitHubService.createPullRequest.mockResolvedValue(
        new PullRequest(
          "https://github.com/pagopa/eng-azure-authorization/pull/52",
        ),
      );

      const result = await authorizationService.requestAuthorization(input);

      expect(result.isOk()).toBe(true);
      const updateCall = gitHubService.updateFile.mock.calls[0][0];
      const updatedParsed = JSON.parse(updateCall.content);

      const externalsGroup = updatedParsed.groups.find(
        (g: { name: string }) => g.name === "test-d-adgroup-externals",
      );
      // Roles updated to default
      expect(externalsGroup.roles).toEqual(["Owner"]);
      // Members preserved
      expect(externalsGroup.members).toContain("bob@pagopa.it");
    });

    it("should preserve custom (non-default) groups", async () => {
      const { authorizationService, gitHubService } = makeEnv();
      const input = makeSampleInput();
      const originalContent = JSON.stringify(
        {
          directory_readers: { service_principals_name: [] },
          groups: [
            {
              members: ["carol@pagopa.it"],
              name: "test-d-adgroup-custom-team",
              roles: ["Contributor"],
            },
          ],
        },
        null,
        2,
      );

      gitHubService.createBranch.mockResolvedValue(undefined);
      gitHubService.getFileContent.mockResolvedValue({
        content: originalContent,
        sha: "sha-groups-4",
      });
      gitHubService.updateFile.mockResolvedValue(undefined);
      gitHubService.createPullRequest.mockResolvedValue(
        new PullRequest(
          "https://github.com/pagopa/eng-azure-authorization/pull/53",
        ),
      );

      const result = await authorizationService.requestAuthorization(input);

      expect(result.isOk()).toBe(true);
      const updateCall = gitHubService.updateFile.mock.calls[0][0];
      const updatedParsed = JSON.parse(updateCall.content);

      // Custom group preserved
      const customGroup = updatedParsed.groups.find(
        (g: { name: string }) => g.name === "test-d-adgroup-custom-team",
      );
      expect(customGroup).toBeDefined();
      expect(customGroup.members).toContain("carol@pagopa.it");
      // All defaults also present
      expect(updatedParsed.groups).toHaveLength(DEFAULT_GROUP_SPECS.length + 1);
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

      // Identity added
      expect(updatedParsed.directory_readers.service_principals_name).toContain(
        "test-bootstrap-identity-id",
      );
      // Extra fields preserved
      expect(updatedParsed.directory_readers.some_other_field).toBe("keep-me");
      expect(updatedParsed.entra_groups).toEqual({ readers: ["reader-group"] });
      expect(updatedParsed.other_top_level).toBe(true);
      // All default groups added
      expect(updatedParsed.groups).toHaveLength(DEFAULT_GROUP_SPECS.length);
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

    it("should upsert groups and create PR when identity already exists", async () => {
      const { authorizationService, gitHubService } = makeEnv();
      const input = makeSampleInput();
      // Identity already present, no groups yet
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
      gitHubService.updateFile.mockResolvedValue(undefined);
      gitHubService.createPullRequest.mockResolvedValue(
        new PullRequest(
          "https://github.com/pagopa/eng-azure-authorization/pull/55",
        ),
      );

      const result = await authorizationService.requestAuthorization(input);

      expect(result.isOk()).toBe(true);
      const authResult = result._unsafeUnwrap();
      expect(authResult.url).toBe(
        "https://github.com/pagopa/eng-azure-authorization/pull/55",
      );

      // Identity must NOT be duplicated
      const updateCall = gitHubService.updateFile.mock.calls[0][0];
      const updatedParsed = JSON.parse(updateCall.content);
      expect(
        updatedParsed.directory_readers.service_principals_name,
      ).toHaveLength(1);
      expect(
        updatedParsed.directory_readers.service_principals_name,
      ).toContain("test-bootstrap-identity-id");

      // All default groups must be created
      expect(updatedParsed.groups).toHaveLength(DEFAULT_GROUP_SPECS.length);
    });

    it("should skip update and PR when identity exists and groups are already correct", async () => {
      const { authorizationService, gitHubService } = makeEnv();
      const input = makeSampleInput();

      // Build a file where the identity is present and all groups are already correct
      const allGroups = DEFAULT_GROUP_SPECS.map((spec) => ({
        members: [],
        name: makeGroupName("test", "d", spec.groupName),
        roles: [...spec.roles],
      }));
      const content = JSON.stringify(
        {
          directory_readers: {
            service_principals_name: ["test-bootstrap-identity-id"],
          },
          groups: allGroups,
        },
        null,
        2,
      );

      gitHubService.createBranch.mockResolvedValue(undefined);
      gitHubService.getFileContent.mockResolvedValue({
        content,
        sha: "sha-noop",
      });

      const result = await authorizationService.requestAuthorization(input);

      // Should succeed as a no-op (no PR created)
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().url).toBeUndefined();

      // File and PR must not be touched
      expect(gitHubService.updateFile).not.toHaveBeenCalled();
      expect(gitHubService.createPullRequest).not.toHaveBeenCalled();
    });

    it("should update group roles and create PR when identity exists with wrong roles", async () => {
      const { authorizationService, gitHubService } = makeEnv();
      const input = makeSampleInput();

      // Identity present, but externals group has wrong roles
      const content = JSON.stringify(
        {
          directory_readers: {
            service_principals_name: ["test-bootstrap-identity-id"],
          },
          groups: [
            {
              members: ["bob@pagopa.it"],
              name: "test-d-adgroup-externals",
              roles: ["Reader"],
            },
          ],
        },
        null,
        2,
      );

      gitHubService.createBranch.mockResolvedValue(undefined);
      gitHubService.getFileContent.mockResolvedValue({
        content,
        sha: "sha-roles",
      });
      gitHubService.updateFile.mockResolvedValue(undefined);
      gitHubService.createPullRequest.mockResolvedValue(
        new PullRequest(
          "https://github.com/pagopa/eng-azure-authorization/pull/56",
        ),
      );

      const result = await authorizationService.requestAuthorization(input);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().url).toBe(
        "https://github.com/pagopa/eng-azure-authorization/pull/56",
      );

      const updateCall = gitHubService.updateFile.mock.calls[0][0];
      const updatedParsed = JSON.parse(updateCall.content);

      const externalsGroup = updatedParsed.groups.find(
        (g: { name: string }) => g.name === "test-d-adgroup-externals",
      );
      expect(externalsGroup.roles).toEqual(["Owner"]);
      // Member preserved
      expect(externalsGroup.members).toContain("bob@pagopa.it");
      // Identity not duplicated
      expect(
        updatedParsed.directory_readers.service_principals_name,
      ).toHaveLength(1);
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
