import { mock } from "vitest-mock-extended";

import { Logger } from "../logger.js";
import { NodeReader } from "../node.js";
import { RepositoryReader } from "../reporisoty.js";

export const makeMockDependencies = () => ({
  logger: mock<Logger>(),
  nodeReader: mock<NodeReader>(),
  repositoryReader: mock<RepositoryReader>(),
});
