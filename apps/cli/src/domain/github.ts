export type PullRequestBody = {
  base: string;
  body: string;
  head: string;
  owner: string;
  repo: string;
  title: string;
};

export interface GitHubService {
  /**
   * Creates a pull request in a GitHub repository.
   * @throws Error if pull request creation fails
   */
  createPullRequest(params: PullRequestBody): Promise<PullRequest>;

  /**
   * Gets a GitHub repository by owner and name.
   * @throws RepositoryNotFoundError if repository doesn't exist (404)
   * @throws Error for other failures
   */
  getRepository(owner: string, name: string): Promise<Repository>;
}

export class PullRequest {
  constructor(public readonly url: string) {}
}

export class Repository {
  get fullName(): string {
    return `${this.owner}/${this.name}`;
  }

  get ssh(): string {
    return `git@github.com:${this.owner}/${this.name}.git`;
  }

  get url(): string {
    return `https://github.com/${this.owner}/${this.name}`;
  }

  constructor(
    public readonly name: string,
    public readonly owner: string,
  ) {}
}

export class RepositoryNotFoundError extends Error {
  constructor(owner: string, name: string) {
    super(`Repository ${owner}/${name} not found`);
    this.name = "RepositoryNotFoundError";
  }
}
