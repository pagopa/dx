import { Logger } from "./logger.js";
import { NodeReader } from "./node.js";
import { RepositoryReader } from "./repository.js";

export interface Dependencies {
  logger: Logger;
  nodeReader: NodeReader;
  repositoryReader: RepositoryReader;
}
