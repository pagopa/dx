import { getLogger } from "@logtape/logtape";
import { Octokit } from "octokit";

export const getLatestCommitSha = async (
  owner: string,
  repo: string,
  ref = "main",
) => {
  const octokit = new Octokit();
  const response = await octokit.rest.repos.getCommit({
    owner,
    ref,
    repo,
  });
  return response.data.sha;
};

export const getLatestCommitShaOrRef = async (
  owner: string,
  repo: string,
  ref = "main",
) => {
  const logger = getLogger(["dx-cli", "codemod"]);
  return getLatestCommitSha(owner, repo, ref).catch(() => {
    logger.warn(
      "Failed to fetch the latest commit from {owner}/{repo}, fallback to {fallback}",
      { fallback: ref, owner, repo },
    );
    return ref;
  });
};
