import { ResultAsync } from "neverthrow";
import { join } from "node:path";
import { z } from "zod/v4";

import { packageJsonSchema } from "../../domain/package-json.js";
import { RepositoryReader } from "../../domain/repository.js";
import { Workspace, workspaceSchema } from "../../domain/workspace.js";
import { parseYaml } from "../yaml/index.js";
import { decode } from "../zod/index.js";
import { fileExists, readFile, readFileAndDecode } from "./fs/file-reader.js";

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

const resolveWorkspacePattern = (repoRoot: string) => (pattern: string) =>
  ResultAsync.fromPromise(
    Array.fromAsync(fs.glob(pattern, { cwd: repoRoot })),
    (cause) =>
      new Error(`Failed to resolve workspace glob: ${pattern}`, {
        cause,
      }),
  ).map((subDirectories) =>
    // Create the absolute path to the subdirectory
    subDirectories.map((directory) => join(repoRoot, directory)),
  );

const getWorkspaces = (repoRoot: string): ResultAsync<Workspace[], Error> =>
  readFile(join(repoRoot, "pnpm-workspace.yaml"))
    .andThen(parseYaml)
    // Decode the pnpm-workspace.yaml file to a zod schema
    .andThen(decode(z.object({ packages: z.array(z.string()) })))
    .andThen(({ packages }) =>
      // For every package pattern in the pnpm-workspace.yaml file, get the list of subdirectories
      ResultAsync.combine(packages.map(resolveWorkspacePattern(repoRoot)))
        .map((workspacesList) => workspacesList.flat())
        .andThen((workspaceFolders) => {
          // For every subdirectory, read the package.json file and decode it to a zod schema
          const workspaceResults = workspaceFolders.map(
            (nodeWorkspaceDirectory) =>
              readFileAndDecode(
                join(nodeWorkspaceDirectory, "package.json"),
                packageJsonSchema,
              ).map(({ name }) =>
                // Create the workspace object using the package.json name and the nodeWorkspaceDirectory
                workspaceSchema.parse({ name, path: nodeWorkspaceDirectory }),
              ),
          );
          // Execute and combine the results
          return ResultAsync.combine(workspaceResults);
        }),
    );

export const makeRepositoryReader = (): RepositoryReader => ({
  fileExists,
  findRepositoryRoot,
  getWorkspaces: getWorkspaces,
  readFile,
});
