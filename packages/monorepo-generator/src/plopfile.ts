import { NodePlopAPI } from "plop";

import scaffoldMonorepo from "./index.js";

const generate = (plop: NodePlopAPI) => {
  scaffoldMonorepo(plop);
};

export default generate;
