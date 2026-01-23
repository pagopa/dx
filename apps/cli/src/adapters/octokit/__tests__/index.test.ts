import { err, ok } from "neverthrow";
import { Octokit, RequestError } from "octokit";
import { SemVer } from "semver";
import { beforeEach, describe, expect, it } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

import {
  FileNotFoundError,
  PullRequest,
  Repository,
  RepositoryNotFoundError,
} from "../../../domain/github.js";
import { fetchLatestRelease, fetchLatestTag } from "../index.js";
import { OctokitGitHubService } from "../index.js";

const makeEnv = () => {
  const mockOctokit = mockDeep<Octokit>();
  const githubService = new OctokitGitHubService(mockOctokit);

  return {
    githubService,
    mockOctokit,
  };
};

// eslint-disable-next-line max-lines-per-function
describe("OctokitGitHubService", () => {
  describe("getRepository", () => {
    it("should return a Repository when the repository exists", async () => {
      const { githubService, mockOctokit } = makeEnv();
      const owner = "pagopa";
      const name = "dx";
      const mockResponse = {
        data: {
          full_name: "pagopa/dx",
          name: "dx",
          owner: {
            login: "pagopa",
          },
        },
      };

      mockOctokit.rest.repos.get.mockResolvedValue(mockResponse as never);

      const result = await githubService.getRepository(owner, name);

      expect(result).toBeInstanceOf(Repository);
      expect(result.name).toBe("dx");
      expect(result.owner).toBe("pagopa");
      expect(result.fullName).toBe("pagopa/dx");
      expect(result.url).toBe("https://github.com/pagopa/dx");
      expect(result.ssh).toBe("git@github.com:pagopa/dx.git");
      expect(mockOctokit.rest.repos.get).toHaveBeenCalledWith({
        owner,
        repo: name,
      });
    });

    it("should throw an error when the repository does not exist (404)", async () => {
      const { githubService, mockOctokit } = makeEnv();
      const owner = "pagopa";
      const name = "non-existent";
      const error = new RequestError("Not Found", 404, {
        request: {
          headers: {},
          method: "GET",
          url: "https://api.github.com/repos/pagopa/non-existent",
        },
        response: {
          data: { message: "Not Found" },
          headers: {},
          status: 404,
          url: "https://api.github.com/repos/pagopa/non-existent",
        },
      });

      mockOctokit.rest.repos.get.mockRejectedValue(error);

      await expect(githubService.getRepository(owner, name)).rejects.toThrow(
        RepositoryNotFoundError,
      );
      await expect(
        githubService.getRepository(owner, name),
      ).rejects.toThrowError("Repository pagopa/non-existent not found");
    });

    it("should throw an error when the API call fails", async () => {
      const { githubService, mockOctokit } = makeEnv();
      const owner = "pagopa";
      const name = "dx";
      const error = new RequestError("API Error", 500, {
        request: {
          headers: {},
          method: "GET",
          url: "https://api.github.com/repos/pagopa/dx",
        },
        response: {
          data: { message: "API Error" },
          headers: {},
          status: 500,
          url: "https://api.github.com/repos/pagopa/dx",
        },
      });

      mockOctokit.rest.repos.get.mockRejectedValue(error);

      await expect(
        githubService.getRepository(owner, name),
      ).rejects.toThrowError("Failed to fetch repository pagopa/dx");
    });
  });

  describe("createPullRequest", () => {
    it("should return a PullRequest when creation succeeds", async () => {
      const { githubService, mockOctokit } = makeEnv();
      const params = {
        base: "main",
        body: "This is a test PR",
        head: "feature-branch",
        owner: "pagopa",
        repo: "dx",
        title: "Test Pull Request",
      };
      const mockResponse = {
        data: {
          html_url: "https://github.com/pagopa/dx/pull/123",
        },
      };

      mockOctokit.rest.pulls.create.mockResolvedValue(mockResponse as never);

      const result = await githubService.createPullRequest(params);

      expect(result).toBeInstanceOf(PullRequest);
      expect(result.url).toBe("https://github.com/pagopa/dx/pull/123");
      expect(mockOctokit.rest.pulls.create).toHaveBeenCalledWith({
        base: params.base,
        body: params.body,
        head: params.head,
        owner: params.owner,
        repo: params.repo,
        title: params.title,
      });
    });

    it("should throw an error when PR creation fails", async () => {
      const { githubService, mockOctokit } = makeEnv();
      const params = {
        base: "main",
        body: "This is a test PR",
        head: "feature-branch",
        owner: "pagopa",
        repo: "dx",
        title: "Test Pull Request",
      };
      const error = new RequestError("Validation Failed", 422, {
        request: {
          headers: {},
          method: "POST",
          url: "https://api.github.com/repos/pagopa/dx/pulls",
        },
        response: {
          data: { message: "Validation Failed" },
          headers: {},
          status: 422,
          url: "https://api.github.com/repos/pagopa/dx/pulls",
        },
      });

      mockOctokit.rest.pulls.create.mockRejectedValue(error);

      await expect(
        githubService.createPullRequest(params),
      ).rejects.toThrowError("Failed to create pull request in pagopa/dx");
    });
  });

  describe("getFileContent", () => {
    it("should return file content and sha when file exists", async () => {
      const { githubService, mockOctokit } = makeEnv();
      const params = {
        owner: "pagopa",
        path: "src/test.tf",
        ref: "main",
        repo: "test-repo",
      };
      const fileContent = "test content";
      const mockResponse = {
        data: {
          content: Buffer.from(fileContent).toString("base64"),
          sha: "abc123sha",
          type: "file",
        },
      };

      mockOctokit.rest.repos.getContent.mockResolvedValue(
        mockResponse as never,
      );

      const result = await githubService.getFileContent(params);

      expect(result.content).toBe(fileContent);
      expect(result.sha).toBe("abc123sha");
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
        owner: params.owner,
        path: params.path,
        ref: params.ref,
        repo: params.repo,
      });
    });

    it("should throw FileNotFoundError when file does not exist (404)", async () => {
      const { githubService, mockOctokit } = makeEnv();
      const params = {
        owner: "pagopa",
        path: "non-existent.tf",
        repo: "test-repo",
      };
      const error = new RequestError("Not Found", 404, {
        request: {
          headers: {},
          method: "GET",
          url: "https://api.github.com/repos/pagopa/test-repo/contents/non-existent.tf",
        },
        response: {
          data: { message: "Not Found" },
          headers: {},
          status: 404,
          url: "https://api.github.com/repos/pagopa/test-repo/contents/non-existent.tf",
        },
      });

      mockOctokit.rest.repos.getContent.mockRejectedValue(error);

      await expect(githubService.getFileContent(params)).rejects.toThrow(
        FileNotFoundError,
      );
      await expect(githubService.getFileContent(params)).rejects.toThrowError(
        "File not found: non-existent.tf",
      );
    });

    it("should throw an error when path is a directory", async () => {
      const { githubService, mockOctokit } = makeEnv();
      const params = {
        owner: "pagopa",
        path: "src/directory",
        repo: "test-repo",
      };
      // GitHub returns an array for directories
      const mockResponse = {
        data: [
          { name: "file1.ts", type: "file" },
          { name: "file2.ts", type: "file" },
        ],
      };

      mockOctokit.rest.repos.getContent.mockResolvedValue(
        mockResponse as never,
      );

      await expect(githubService.getFileContent(params)).rejects.toThrowError(
        "Path src/directory is not a file",
      );
    });

    it("should throw an error when API call fails", async () => {
      const { githubService, mockOctokit } = makeEnv();
      const params = {
        owner: "pagopa",
        path: "src/test.tf",
        repo: "test-repo",
      };
      const error = new RequestError("Server Error", 500, {
        request: {
          headers: {},
          method: "GET",
          url: "https://api.github.com/repos/pagopa/test-repo/contents/src/test.tf",
        },
        response: {
          data: { message: "Server Error" },
          headers: {},
          status: 500,
          url: "https://api.github.com/repos/pagopa/test-repo/contents/src/test.tf",
        },
      });

      mockOctokit.rest.repos.getContent.mockRejectedValue(error);

      await expect(githubService.getFileContent(params)).rejects.toThrowError(
        "Failed to get file content: src/test.tf",
      );
    });
  });

  describe("createBranch", () => {
    it("should create a new branch from an existing ref", async () => {
      const { githubService, mockOctokit } = makeEnv();
      const params = {
        branchName: "feats/new-feature",
        fromRef: "main",
        owner: "pagopa",
        repo: "test-repo",
      };
      const refResponse = {
        data: {
          object: {
            sha: "mainbranchsha123",
          },
        },
      };

      mockOctokit.rest.git.getRef.mockResolvedValue(refResponse as never);
      mockOctokit.rest.git.createRef.mockResolvedValue({} as never);

      await githubService.createBranch(params);

      expect(mockOctokit.rest.git.getRef).toHaveBeenCalledWith({
        owner: params.owner,
        ref: "heads/main",
        repo: params.repo,
      });
      expect(mockOctokit.rest.git.createRef).toHaveBeenCalledWith({
        owner: params.owner,
        ref: "refs/heads/feats/new-feature",
        repo: params.repo,
        sha: "mainbranchsha123",
      });
    });

    it("should throw an error when branch creation fails", async () => {
      const { githubService, mockOctokit } = makeEnv();
      const params = {
        branchName: "feats/new-feature",
        fromRef: "main",
        owner: "pagopa",
        repo: "test-repo",
      };
      const refResponse = {
        data: {
          object: {
            sha: "mainbranchsha123",
          },
        },
      };
      const error = new RequestError("Reference already exists", 422, {
        request: {
          headers: {},
          method: "POST",
          url: "https://api.github.com/repos/pagopa/test-repo/git/refs",
        },
        response: {
          data: { message: "Reference already exists" },
          headers: {},
          status: 422,
          url: "https://api.github.com/repos/pagopa/test-repo/git/refs",
        },
      });

      mockOctokit.rest.git.getRef.mockResolvedValue(refResponse as never);
      mockOctokit.rest.git.createRef.mockRejectedValue(error);

      await expect(githubService.createBranch(params)).rejects.toThrowError(
        "Failed to create branch: feats/new-feature",
      );
    });

    it("should throw an error when source ref does not exist", async () => {
      const { githubService, mockOctokit } = makeEnv();
      const params = {
        branchName: "feats/new-feature",
        fromRef: "non-existent",
        owner: "pagopa",
        repo: "test-repo",
      };
      const error = new RequestError("Not Found", 404, {
        request: {
          headers: {},
          method: "GET",
          url: "https://api.github.com/repos/pagopa/test-repo/git/ref/heads/non-existent",
        },
        response: {
          data: { message: "Not Found" },
          headers: {},
          status: 404,
          url: "https://api.github.com/repos/pagopa/test-repo/git/ref/heads/non-existent",
        },
      });

      mockOctokit.rest.git.getRef.mockRejectedValue(error);

      await expect(githubService.createBranch(params)).rejects.toThrowError(
        "Failed to create branch: feats/new-feature",
      );
    });
  });

  describe("updateFile", () => {
    it("should update a file successfully", async () => {
      const { githubService, mockOctokit } = makeEnv();
      const params = {
        branch: "feats/new-feature",
        content: "updated content",
        message: "Update file",
        owner: "pagopa",
        path: "src/test.tf",
        repo: "test-repo",
        sha: "existingfilesha123",
      };

      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue(
        {} as never,
      );

      await githubService.updateFile(params);

      expect(
        mockOctokit.rest.repos.createOrUpdateFileContents,
      ).toHaveBeenCalledWith({
        branch: params.branch,
        content: Buffer.from(params.content).toString("base64"),
        message: params.message,
        owner: params.owner,
        path: params.path,
        repo: params.repo,
        sha: params.sha,
      });
    });

    it("should throw an error when file update fails", async () => {
      const { githubService, mockOctokit } = makeEnv();
      const params = {
        branch: "feats/new-feature",
        content: "updated content",
        message: "Update file",
        owner: "pagopa",
        path: "src/test.tf",
        repo: "test-repo",
        sha: "wrongsha",
      };
      const error = new RequestError("Conflict", 409, {
        request: {
          headers: {},
          method: "PUT",
          url: "https://api.github.com/repos/pagopa/test-repo/contents/src/test.tf",
        },
        response: {
          data: { message: "Conflict" },
          headers: {},
          status: 409,
          url: "https://api.github.com/repos/pagopa/test-repo/contents/src/test.tf",
        },
      });

      mockOctokit.rest.repos.createOrUpdateFileContents.mockRejectedValue(
        error,
      );

      await expect(githubService.updateFile(params)).rejects.toThrowError(
        "Failed to update file: src/test.tf",
      );
    });
  });
});

describe("octokit adapter", () => {
  const owner = "test-owner";
  const repo = "test-repo";
  const client = mockDeep<Octokit>();

  beforeEach(() => {
    mockReset(client);
  });

  describe("fetchLatestTag", () => {
    it("should return the highest valid semver tag", async () => {
      client.request.mockResolvedValueOnce({
        data: [
          { name: "v1.0.0" },
          { name: "2.0.0-beta.1" },
          { name: "2.0.0" },
          { name: "not-a-version" },
        ],
        headers: {},
        status: 200,
        url: "",
      });

      const result = await fetchLatestTag({ client, owner, repo });
      expect(result).toStrictEqual(ok(new SemVer("2.0.0")));

      expect(client.request).toHaveBeenCalledWith(
        "GET /repos/{owner}/{repo}/tags",
        { owner, repo },
      );
    });

    it("returns null if there are no valid semver tags", async () => {
      client.request.mockResolvedValueOnce({
        data: [{ name: "foo" }, { name: "bar" }],
        headers: {},
        status: 200,
        url: "",
      });

      const result = await fetchLatestTag({ client, owner, repo });
      expect(result).toStrictEqual(ok(null));
    });

    it("should return an error when client promise fails", async () => {
      client.request.mockRejectedValueOnce(new Error("an error"));

      const result = await fetchLatestTag({ client, owner, repo });
      expect(result).toStrictEqual(
        err(new Error("Failed to fetch tags for test-owner/test-repo")),
      );
    });
  });

  describe("fetchLatestRelease", () => {
    it("should return parsed semver for the latest release tag", async () => {
      client.request.mockResolvedValueOnce({
        data: { tag_name: "v1.2.3" },
        headers: {},
        status: 200,
        url: "",
      });

      const result = await fetchLatestRelease({ client, owner, repo });
      expect(result).toStrictEqual(ok(new SemVer("v1.2.3")));

      expect(client.request).toHaveBeenCalledWith(
        "GET /repos/{owner}/{repo}/releases/latest",
        { owner, repo },
      );
    });
  });
});
