import { err, ok, Result, ResultAsync } from "neverthrow";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

import { RepositoryReader } from "../../domain/repository.js";
import { Workspace } from "../../domain/workspace.js";
import { readFile } from "./fs/index.js";

const findRoot = (dir: string): Result<string, Error> => {
  const gitPath = join(dir, ".git");
  if (existsSync(gitPath)) return ok(dir);

  const parent = dirname(dir);
  if (dir === parent) {
    return err(
      new Error(
        "Could not find repository root. Make sure to have the repo initialized.",
      ),
    );
  }

  return findRoot(parent);
};

const existsPreCommitConfig = (repoRoot: string): Result<boolean, Error> => {
  const fileName = ".pre-commit-config.yaml";
  const preCommitPath = join(repoRoot, fileName);
  if (existsSync(preCommitPath)) {
    return ok(true);
  }

  return err(
    new Error(
      `${fileName} not found in repository root. Make sure to have pre-commit configured for the repository.`,
    ),
  );
};

const existsTurboConfig = (repoRoot: string): Result<boolean, Error> => {
  const fileName = "turbo.json";
  const turboPath = join(repoRoot, fileName);
  if (existsSync(turboPath)) {
    return ok(true);
  }

  return err(
    new Error(
      `${fileName} not found in repository root. Make sure to have Turbo configured for the monorepo.`,
    ),
  );
};

const getWorkspaces = (repoRoot: string): ResultAsync<Workspace[], Error> =>
  readFile(repoRoot, "pnpm-workspace.yaml").map(() => [] as Workspace[]);

export const makeRepositoryReader = (): RepositoryReader => ({
  existsPreCommitConfig: existsPreCommitConfig,
  existsTurboConfig: existsTurboConfig,
  findRepositoryRoot: findRoot,
  getWorkspaces: getWorkspaces,
});
