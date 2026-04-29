import { $ } from "execa";
import sodium from "libsodium-wrappers";
import { ResultAsync } from "neverthrow";
import { Octokit, RequestError } from "octokit";
import semverParse from "semver/functions/parse.js";
import semverSort from "semver/functions/sort.js";

import {
  CreateBranchParams,
  CreateOrUpdateEnvironmentSecretParams,
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

  async createOrUpdateEnvironmentSecret(
    params: CreateOrUpdateEnvironmentSecretParams,
  ): Promise<void> {
    try {
      // GitHub requires environment secrets to be encrypted client-side with libsodium.
      await sodium.ready;

      // Ensure the target environment exists before resolving its public key and storing secrets.
      await this.#octokit.request(
        "PUT /repos/{owner}/{repo}/environments/{environment_name}",
        {
          environment_name: params.environmentName,
          owner: params.owner,
          repo: params.repo,
        },
      );

      const { data: publicKeyData } =
        await this.#octokit.rest.actions.getEnvironmentPublicKey({
          environment_name: params.environmentName,
          owner: params.owner,
          repo: params.repo,
        });

      const publicKeyBytes = sodium.from_base64(
        publicKeyData.key,
        sodium.base64_variants.ORIGINAL,
      );
      const secretBytes = sodium.from_string(params.secretValue);
      const encryptedBytes = sodium.crypto_box_seal(
        secretBytes,
        publicKeyBytes,
      );
      const encryptedValue = sodium.to_base64(
        encryptedBytes,
        sodium.base64_variants.ORIGINAL,
      );

      await this.#octokit.rest.actions.createOrUpdateEnvironmentSecret({
        encrypted_value: encryptedValue,
        environment_name: params.environmentName,
        key_id: publicKeyData.key_id,
        owner: params.owner,
        repo: params.repo,
        secret_name: params.secretName,
      });
    } catch (error) {
      throw new Error(
        `Failed to create or update secret ${params.secretName} in environment ${params.environmentName}`,
        { cause: error },
      );
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
