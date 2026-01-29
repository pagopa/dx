import { type NodePlopAPI } from "node-plop";
import * as assert from "node:assert/strict";

import { environmentShort } from "../../../domain/environment.js";
import { Payload, payloadSchema } from "../generators/environment/prompts.js";

export const resourcePrefix = (
  payload: Pick<Payload, "env" | "workspace">,
): string => {
  const { env, workspace } = payload;
  const prefix = [env.prefix, environmentShort[env.name]];
  if (workspace.domain) {
    prefix.push(workspace.domain);
  }
  return prefix.join("-").toLowerCase();
};

export default (plop: NodePlopAPI) => {
  plop.setHelper("resourcePrefix", (ctx) => {
    const result = payloadSchema.safeParse(ctx);
    assert.ok(result.success, "resourcePrefix: Invalid payload provided");
    return resourcePrefix(result.data);
  });
};
