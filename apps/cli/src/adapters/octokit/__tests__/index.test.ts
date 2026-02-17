import { err, ok } from "neverthrow";
import { Octokit, RequestError } from "octokit";
import { SemVer } from "semver";
import { beforeEach, describe, expect, it } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

import {
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
