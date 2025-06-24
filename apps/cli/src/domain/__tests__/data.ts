import { mock } from "vitest-mock-extended";

import { NodeReader } from "../node.js";
import { RepositoryReader } from "../reporisoty";
import { Writer } from "../writer.js";

export const makeMockDependencies = () => ({
  nodeReader: mock<NodeReader>(),
  repositoryReader: mock<RepositoryReader>(),
  writer: mock<Writer>(),
});
