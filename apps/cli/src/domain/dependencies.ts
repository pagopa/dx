import { NodeReader } from "./node.js";
import { RepositoryReader } from "./reporisoty.js";
import { Writer } from "./writer.js";

export interface Dependencies {
  nodeReader: NodeReader;
  repositoryReader: RepositoryReader;
  writer: Writer;
}
