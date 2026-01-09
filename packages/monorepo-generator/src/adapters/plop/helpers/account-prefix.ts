import { type NodePlopAPI } from "node-plop";
import * as assert from "node:assert/strict";

import {
  CloudAccount,
  cloudAccountSchema,
} from "../../../domain/cloud-account.js";

export const accountPrefix = ({ csp, displayName }: CloudAccount) =>
  `${csp}_${displayName.toLowerCase().replaceAll("-", "_")}`;

export default (plop: NodePlopAPI) => {
  plop.setHelper("accountPrefix", (ctx) => {
    const result = cloudAccountSchema.safeParse(ctx);
    assert.ok(
      result.success,
      "accountPrefix: Invalid CloudAccount object provided",
    );
    return accountPrefix(result.data);
  });
};
