import { ResultAsync } from "neverthrow";
import fs from "node:fs/promises";
import { join } from "node:path";

import { RepositoryReader } from "../../domain/repository.js";
import { fileExists } from "./fs/file-reader.js";

const findRoot = (dir = process.cwd()): ResultAsync<string, Error> => {
  const gitPath = join(dir, ".git");
  return ResultAsync.fromPromise(
    fs.stat(gitPath),
    () =>
      new Error(
        "Could not find repository root. Make sure to have the repo initialized.",
      ),
  ).map(() => dir);
};

const existsPreCommitConfig = (repoRoot: string): ResultAsync<boolean, Error> =>
  fileExists(join(repoRoot, ".pre-commit-config.yaml")).mapErr(
    () =>
      new Error(
        `.pre-commit-config.yaml not found in repository root. Make sure to have pre-commit configured for the repository.`,
      ),
  );

const existsTurboConfig = (repoRoot: string): ResultAsync<boolean, Error> =>
  fileExists(join(repoRoot, "turbo.json")).mapErr(
    () =>
      new Error(
        `turbo.json not found in repository root. Make sure to have Turbo configured for the monorepo.`,
      ),
  );

export const makeRepositoryReader = (): RepositoryReader => ({
  existsPreCommitConfig,
  existsTurboConfig,
  findRepositoryRoot: findRoot,
});
