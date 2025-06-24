import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

import { RepositoryReader } from "../../domain/reporisoty.js";

const findRoot = (dir: string): null | string => {
  const gitPath = join(dir, ".git");
  if (existsSync(gitPath)) return dir;

  const parent = dirname(dir);
  return dir === parent ? null : findRoot(parent);
};

export const makeRepositoryReader = (): RepositoryReader => ({
  findRepositoryRoot: findRoot,
});
