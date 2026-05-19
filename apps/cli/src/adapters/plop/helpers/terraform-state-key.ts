/**
 * Terraform state key helper.
 *
 * Keeps the DX environment generator aligned with the shared
 * prefix/domain/scope.tfstate convention for remote state keys.
 */
import { type NodePlopAPI } from "node-plop";
import * as assert from "node:assert/strict";
import { z } from "zod/v4";

import { Payload, payloadSchema } from "../generators/environment/prompts.js";

const terraformStatePayloadSchema = payloadSchema.pick({
  env: true,
  workspace: true,
});

const terraformStateScopeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Terraform state scope is required")
  .regex(
    /^[a-z0-9-]+$/,
    "Terraform state scope may contain only lowercase letters, numbers, and hyphens",
  );

type TerraformStatePayload = Pick<Payload, "env" | "workspace">;

export const terraformStateKey = (
  payload: TerraformStatePayload,
  scope: string,
): string => {
  const parsedScope = terraformStateScopeSchema.parse(scope);

  return `${payload.env.prefix}/${payload.workspace.domain}/${parsedScope}.tfstate`;
};

export default (plop: NodePlopAPI) => {
  plop.setHelper("terraformStateKey", (ctx, scope: string) => {
    const result = terraformStatePayloadSchema.safeParse(ctx);

    assert.ok(result.success, "terraformStateKey: Invalid payload provided");

    return terraformStateKey(result.data, scope);
  });
};
