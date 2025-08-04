import { ResultAsync } from "neverthrow";
import { join } from "node:path";

import { RepositoryReader } from "../../domain/repository.js";
import { fileExists, readFile } from "./fs/file-reader.js";

const findRepositoryRoot = (
  dir = process.cwd(),
): ResultAsync<string, Error> => {
  const gitPath = join(dir, ".git");
  return fileExists(gitPath)
    .mapErr(
      () =>
        new Error(
          "Could not find repository root. Make sure to have the repo initialized.",
        ),
    )
    .map(() => dir);
};

export const makeRepositoryReader = (): RepositoryReader => ({
  fileExists,
  findRepositoryRoot,
  readFile,
});
