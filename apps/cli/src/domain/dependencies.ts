import { Logger } from "./logger.js";
import { PackageJsonReader } from "./package-json.js";
import { RepositoryReader } from "./repository.js";

export interface Dependencies {
  logger: Logger;
  packageJsonReader: PackageJsonReader;
  repositoryReader: RepositoryReader;
}
