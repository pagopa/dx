import { PackageJsonReader } from "./package-json.js";
import { RepositoryReader } from "./repository.js";

export interface Dependencies {
  packageJsonReader: PackageJsonReader;
  repositoryReader: RepositoryReader;
}
