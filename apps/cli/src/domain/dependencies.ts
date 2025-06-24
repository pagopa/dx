import { Logger } from "./logger.js";
import { NodeReader } from "./node.js";
import { RepositoryReader } from "./reporisoty.js";

export interface Dependencies {
  nodeReader: NodeReader;
  repositoryReader: RepositoryReader;
  writer: Logger;
}
