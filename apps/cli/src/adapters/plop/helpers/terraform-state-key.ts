/**
 * Terraform state key helper.
 *
 * Keeps the DX environment generator aligned with the shared
 * prefix/domain/scope.tfstate convention for remote state keys.
 */
import { type NodePlopAPI } from "node-plop";
import { z } from "zod/v4";

import { payloadSchema } from "../generators/environment/prompts.js";

const terraformStateContextSchema = payloadSchema.pick({
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

type TerraformStateContext = z.infer<typeof terraformStateContextSchema>;

export const terraformStateKey = (
  context: TerraformStateContext,
  scope: string,
): string => {
  const parsedScope = terraformStateScopeSchema.parse(scope);

  return `${context.env.prefix}/${context.workspace.domain}/${parsedScope}.tfstate`;
};

export default (plop: NodePlopAPI) => {
  plop.setHelper("terraformStateKey", (input, scope: string) => {
    const context = terraformStateContextSchema.parse(input);

    return terraformStateKey(context, scope);
  });
};
