import { ResultAsync } from "neverthrow";
import { Octokit } from "octokit";
import semverParse from "semver/functions/parse.js";
import semverSort from "semver/functions/sort.js";

interface GitHubReleaseParam {
  owner: string;
  repo: string;
}

export const fetchLatestTag = async ({ owner, repo }: GitHubReleaseParam) => {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  return (
    ResultAsync.fromPromise(
      // Get repository tags
      octokit.request("GET /repos/{owner}/{repo}/tags", {
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
      .map((tags) => tags.pop())
  );
};

export const fetchLatestRelease = async ({
  owner,
  repo,
}: GitHubReleaseParam) => {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  return ResultAsync.fromPromise(
    // Get the latest release for a repository
    octokit.request("GET /repos/{owner}/{repo}/releases/latest", {
      owner,
      repo,
    }),
    () => new Error(`Failed to fetch latest release for ${owner}/${repo}`),
  ).map(({ data }) => semverParse(data.tag_name));
};
