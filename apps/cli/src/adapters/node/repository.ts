import { err, ok, Result } from "neverthrow";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

import { RepositoryReader } from "../../domain/repository.js";

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

export const makeRepositoryReader = (): RepositoryReader => ({
  findRepositoryRoot: findRoot,
});
