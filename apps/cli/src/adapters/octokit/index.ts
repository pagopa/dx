import { $ } from "execa";
import { ResultAsync } from "neverthrow";
import { Octokit, RequestError } from "octokit";
import semverParse from "semver/functions/parse.js";
import semverSort from "semver/functions/sort.js";

import {
  GitHubService,
  PullRequest,
  Repository,
  RepositoryNotFoundError,
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
}

// Follow the same order of precedence of gh cli
// https://cli.github.com/manual/gh_help_environment
export const getGitHubPAT = async (): Promise<string | undefined> => {
  if (process.env.GH_TOKEN) {
    return process.env.GH_TOKEN;
  }
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }
  const result = await $({ reject: false })`gh auth token`;
  if (!result.failed && result.exitCode === 0) {
    return result.stdout.trim();
  }
  return undefined;
};

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
