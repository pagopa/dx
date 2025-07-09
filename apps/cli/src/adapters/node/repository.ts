import { ResultAsync } from "neverthrow";
import { join } from "node:path";

import { RepositoryReader } from "../../domain/repository.js";
import { Workspace } from "../../domain/workspace.js";
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getWorkspaces = (_repoRoot: string): ResultAsync<Workspace[], Error> =>
  // TODO: Implement this. For now, we're returning an empty array.
  ResultAsync.fromPromise(
    Promise.resolve([]),
    () => new Error("Failed to get workspaces"),
  );

export const makeRepositoryReader = (): RepositoryReader => ({
  fileExists,
  findRepositoryRoot,
  getWorkspaces: getWorkspaces,
  readFile,
});
