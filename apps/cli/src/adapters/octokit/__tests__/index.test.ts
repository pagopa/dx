import { Octokit, RequestError } from "octokit";
import { describe, expect, it } from "vitest";
import { mockDeep } from "vitest-mock-extended";

import {
  PullRequest,
  Repository,
  RepositoryNotFoundError,
} from "../../../domain/github.js";
import { OctokitGitHubService } from "../index.js";

const makeEnv = () => {
  const mockOctokit = mockDeep<Octokit>();
  const githubService = new OctokitGitHubService(mockOctokit);

  return {
    githubService,
    mockOctokit,
  };
};

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
});
