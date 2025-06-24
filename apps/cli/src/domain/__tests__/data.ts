import { mock } from "vitest-mock-extended";

import { NodeReader } from "../node.js";
import { Writer } from "../writer.js";

export const makeMockDependencies = () => ({
  nodeReader: mock<NodeReader>(),
  writer: mock<Writer>(),
});
