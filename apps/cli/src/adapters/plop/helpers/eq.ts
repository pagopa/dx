import { type NodePlopAPI } from "node-plop";

export default (plop: NodePlopAPI) => {
  plop.setHelper("eq", (a, b) => a === b);
};
