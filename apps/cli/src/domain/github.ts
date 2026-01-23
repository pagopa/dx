export type CreateBranchParams = {
  branchName: string;
  fromRef: string; // source branch (e.g., "main")
  owner: string;
  repo: string;
};

export type FileContent = {
  content: string;
  sha: string; // needed for updating the file
};

export type GetFileContentParams = {
  owner: string;
  path: string;
  ref?: string; // branch/tag/commit (defaults to default branch)
  repo: string;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface GitHubService {
  /**
   * Creates a new branch from an existing reference.
   * @throws Error if branch creation fails
   */
  createBranch(params: CreateBranchParams): Promise<void>;

  /**
   * Creates a pull request in a GitHub repository.
   * @throws Error if pull request creation fails
   */
  createPullRequest(params: PullRequestBody): Promise<PullRequest>;

  /**
   * Gets the content of a file from a GitHub repository.
   * @throws FileNotFoundError if file doesn't exist (404)
   * @throws Error for other failures
   */
  getFileContent(params: GetFileContentParams): Promise<FileContent>;

  /**
   * Gets a GitHub repository by owner and name.
   * @throws RepositoryNotFoundError if repository doesn't exist (404)
   * @throws Error for other failures
   */
  getRepository(owner: string, name: string): Promise<Repository>;

  /**
   * Updates a file in a GitHub repository.
   * @throws Error if file update fails
   */
  updateFile(params: UpdateFileParams): Promise<void>;
}

export type UpdateFileParams = {
  branch: string;
  content: string;
  message: string;
  owner: string;
  path: string;
  repo: string;
  sha: string; // current file sha (for conflict detection)
};

type PullRequestBody = {
  base: string;
  body: string;
  head: string;
  owner: string;
  repo: string;
  title: string;
};

export class FileNotFoundError extends Error {
  constructor(path: string) {
    super(`File not found: ${path}`);
    this.name = "FileNotFoundError";
  }
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
