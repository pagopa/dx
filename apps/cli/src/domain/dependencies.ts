import { NodeReader } from "./node.js";
import { Writer } from "./writer.js";

export interface Dependencies {
  nodeReader: NodeReader;
  writer: Writer;
}
