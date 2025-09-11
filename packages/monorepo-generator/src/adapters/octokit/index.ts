import { ResultAsync } from "neverthrow";
import { Octokit } from "octokit";
import semverParse from "semver/functions/parse.js";
import semverSort from "semver/functions/sort.js";

interface GitHubReleaseParam {
  client: Octokit;
  owner: string;
  repo: string;
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
