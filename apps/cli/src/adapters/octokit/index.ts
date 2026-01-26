import { ResultAsync } from "neverthrow";
import { Octokit, RequestError } from "octokit";
import semverParse from "semver/functions/parse.js";
import semverSort from "semver/functions/sort.js";

import {
  CreateBranchParams,
  FileContent,
  FileNotFoundError,
  GetFileContentParams,
  GitHubService,
  PullRequest,
  Repository,
  RepositoryNotFoundError,
  UpdateFileParams,
} from "../../domain/github.js";

type GitHubReleaseParam = {
  client: Octokit;
  owner: string;
  repo: string;
};

export class OctokitGitHubService implements GitHubService {
  #octokit;

  constructor(octokit: Octokit) {
    this.#octokit = octokit;
  }

  async createBranch(params: CreateBranchParams): Promise<void> {
    try {
      // Get the SHA of the source branch
      const { data: refData } = await this.#octokit.rest.git.getRef({
        owner: params.owner,
        ref: `heads/${params.fromRef}`,
        repo: params.repo,
      });

      // Create the new branch
      await this.#octokit.rest.git.createRef({
        owner: params.owner,
        ref: `refs/heads/${params.branchName}`,
        repo: params.repo,
        sha: refData.object.sha,
      });
    } catch (error) {
      throw new Error(`Failed to create branch: ${params.branchName}`, {
        cause: error,
      });
    }
  }

  async createPullRequest(params: {
    base: string;
    body: string;
    head: string;
    owner: string;
    repo: string;
    title: string;
  }): Promise<PullRequest> {
    try {
      const { data } = await this.#octokit.rest.pulls.create({
        base: params.base,
        body: params.body,
        head: params.head,
        owner: params.owner,
        repo: params.repo,
        title: params.title,
      });
      return new PullRequest(data.html_url);
    } catch (error) {
      throw new Error(
        `Failed to create pull request in ${params.owner}/${params.repo}`,
        {
          cause: error,
        },
      );
    }
  }

  async getFileContent(params: GetFileContentParams): Promise<FileContent> {
    try {
      const { data } = await this.#octokit.rest.repos.getContent({
        owner: params.owner,
        path: params.path,
        ref: params.ref,
        repo: params.repo,
      });

      // GitHub API returns an array for directories, single object for files
      if (Array.isArray(data) || data.type !== "file") {
        throw new Error(`Path ${params.path} is not a file`);
      }

      const content = Buffer.from(data.content, "base64").toString("utf-8");
      return { content, sha: data.sha };
    } catch (error) {
      if (error instanceof RequestError && error.status === 404) {
        throw new FileNotFoundError(params.path);
      }
      throw new Error(`Failed to get file content: ${params.path}`, {
        cause: error,
      });
    }
  }

  async getRepository(owner: string, name: string): Promise<Repository> {
    try {
      const { data } = await this.#octokit.rest.repos.get({
        owner,
        repo: name,
      });
      return new Repository(data.name, data.owner.login);
    } catch (error) {
      if (error instanceof RequestError && error.status === 404) {
        throw new RepositoryNotFoundError(owner, name);
      }
      throw new Error(`Failed to fetch repository ${owner}/${name}`, {
        cause: error,
      });
    }
  }

  async updateFile(params: UpdateFileParams): Promise<void> {
    try {
      await this.#octokit.rest.repos.createOrUpdateFileContents({
        branch: params.branch,
        content: Buffer.from(params.content).toString("base64"),
        message: params.message,
        owner: params.owner,
        path: params.path,
        repo: params.repo,
        sha: params.sha,
      });
    } catch (error) {
      throw new Error(`Failed to update file: ${params.path}`, {
        cause: error,
      });
    }
  }
}

export const fetchLatestTag = ({ client, owner, repo }: GitHubReleaseParam) =>
  ResultAsync.fromPromise(
    // Get repository tags
    client.request("GET /repos/{owner}/{repo}/tags", {
      owner,
      repo,
    }),
    () => new Error(`Failed to fetch tags for ${owner}/${repo}`),
  )
    .map(({ data }) => data.map(({ name }) => name))
    // Filter out tags that are not valid semver
    .map((tags) =>
      tags.map((tag) => semverParse(tag)).filter((tag) => tag !== null),
    )
    // Sort tags in ascending order
    .map(semverSort)
    // Get the latest tag
    .map((tags) => tags.pop() ?? null);

export const fetchLatestRelease = ({
  client,
  owner,
  repo,
}: GitHubReleaseParam) =>
  ResultAsync.fromPromise(
    // Get the latest release for a repository
    client.request("GET /repos/{owner}/{repo}/releases/latest", {
      owner,
      repo,
    }),
    () => new Error(`Failed to fetch latest release for ${owner}/${repo}`),
  ).map(({ data }) => semverParse(data.tag_name));
