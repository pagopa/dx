// Groups the minimal GitHub client contract and repository helpers for publish flows.

export interface EnsuredRepository extends EnsureRepositoryInput {
  created: boolean;
}

export interface EnsureRepositoryInput {
  owner: string;
  repo: string;
}

export interface GitHubClient {
  createRepo(owner: string, repo: string): Promise<void>;
  getRepo(owner: string, repo: string): Promise<GitHubRepositoryStatus>;
}

export type GitHubRepositoryStatus = "found" | "not-found";

export const ensureRepository = async (
  client: GitHubClient,
  input: EnsureRepositoryInput,
): Promise<EnsuredRepository> => {
  const status = await client.getRepo(input.owner, input.repo);

  if (status === "found") {
    return {
      ...input,
      created: false,
    };
  }

  await client.createRepo(input.owner, input.repo);

  return {
    ...input,
    created: true,
  };
};
