import { Octokit, RequestError } from "octokit";

import {
  GitHubService,
  PullRequest,
  Repository,
  RepositoryNotFoundError,
} from "../../domain/github.js";

export class OctokitGitHubService extends GitHubService {
  #octokit;

  constructor(octokit: Octokit) {
    super();
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
