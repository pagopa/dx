import { mock } from "vitest-mock-extended";

import { PackageJsonReader } from "../package-json.js";
import { RepositoryReader } from "../repository.js";

export const makeMockDependencies = () => ({
  packageJsonReader: mock<PackageJsonReader>(),
  repositoryReader: mock<RepositoryReader>(),
});
