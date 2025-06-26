import { mock } from "vitest-mock-extended";

import { Logger } from "../logger.js";
import { PackageJsonReader } from "../package-json.js";
import { RepositoryReader } from "../repository.js";

export const makeMockDependencies = () => ({
  logger: mock<Logger>(),
  packageJsonReader: mock<PackageJsonReader>(),
  repositoryReader: mock<RepositoryReader>(),
});
