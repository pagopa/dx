import { ResultAsync } from "neverthrow";
import { Octokit } from "octokit";

type CreatePullRequest = {
  body?: string;
  head: string;
  repo: {
    name: string;
    owner: string;
  };
};

type Dependencies = {
  client: Octokit;
};

type PullRequest = {
  id: number;
  number: number;
  url: string;
};

/**
 * Creates a Pull Request on GitHub targeting the main branch.
 *
 * @param dependencies - The dependencies required to create a Pull Request
 * @param dependencies.client - Authenticated Octokit instance
 * @returns A function that creates a Pull Request
 */
export const createPullRequest =
  ({ client }: Dependencies) =>
  /**
   * @param params - Parameters for the Pull Request
   * @param params.body - Optional body/description of the Pull Request
   * @param params.head - The head branch for the Pull Request
   * @param params.owner - The repository owner
   * @param params.repo - The repository name
   * @returns A ResultAsync containing either the created Pull Request data or an error
   */
  (params: CreatePullRequest): ResultAsync<PullRequest, Error> => {
    const { body, head, repo } = params;

    return ResultAsync.fromPromise(
      client.request("POST /repos/{owner}/{repo}/pulls", {
        base: "main",
        body,
        head,
        owner: repo.owner,
        repo: repo.name,
        title: "Scaffold repository",
      }),
      (cause) => new Error("Failed to create pull request.", { cause }),
    ).map(
      ({ data }): PullRequest => ({
        id: data.id,
        number: data.number,
        url: data.url,
      }),
    );
  };
