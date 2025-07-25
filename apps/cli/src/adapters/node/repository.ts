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

export const makeRepositoryReader = (): RepositoryReader => ({
  fileExists,
  findRepositoryRoot: findRoot,
});
