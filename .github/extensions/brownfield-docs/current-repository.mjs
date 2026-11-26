// Resolves the current GitHub repository identity for the extension process.
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { parseGitHubRemote, isValidGitHubRepository } from "./github-repository.mjs";

const executeFile = promisify(execFile);

export async function readCurrentGitHubRepository(repositoryRoot) {
  const environmentRepository = process.env.GITHUB_REPOSITORY;
  if (isValidGitHubRepository(environmentRepository)) {
    return environmentRepository;
  }

  let remote;
  try {
    ({ stdout: remote } = await executeFile(
      "git",
      ["remote", "get-url", "origin"],
      { cwd: repositoryRoot, encoding: "utf8" },
    ));
  } catch (error) {
    if (
      error.code === 2 &&
      String(error.stderr).includes("No such remote 'origin'")
    ) {
      return null;
    }
    throw new Error(
      "Could not determine the current GitHub repository from its origin remote.",
      { cause: error },
    );
  }
  return parseGitHubRemote(remote.trim());
}
