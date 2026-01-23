import { type NodePlopAPI } from "node-plop";
import * as assert from "node:assert/strict";

import {
  environmentSchema,
  environmentShort,
} from "../../../domain/environment.js";

export default (plop: NodePlopAPI) => {
  plop.setHelper("envShort", (ctx) => {
    const result = environmentSchema.shape.name.safeParse(ctx);
    assert.ok(result.success, "envShort: Invalid Environment name provided");
    return environmentShort[result.data];
  });
};
