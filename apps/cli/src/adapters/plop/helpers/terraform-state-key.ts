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

const terraformStateNameSchema = z
  .string()
  .regex(
    /^[a-z0-9-]+$/,
    "Terraform state name may contain only lowercase letters, numbers, and hyphens",
  );

type TerraformStateContext = z.infer<typeof terraformStateContextSchema>;

export const terraformStateKey = (
  context: TerraformStateContext,
  name: string,
): string => {
  const parsedName = terraformStateNameSchema.safeParse(name);

  if (!parsedName.success) {
    throw new Error(
      parsedName.error.issues[0]?.message ?? "Invalid Terraform state name",
      {
        cause: parsedName.error,
      },
    );
  }

  return `${context.env.prefix}/${context.workspace.domain}/${parsedName.data}.tfstate`;
};

export default (plop: NodePlopAPI) => {
  plop.setHelper("terraformStateKey", (input, name: string) => {
    const context = terraformStateContextSchema.safeParse(input);

    if (!context.success) {
      throw new Error(
        context.error.issues[0]?.message ??
          "Invalid Terraform state helper input",
        {
          cause: context.error,
        },
      );
    }

    return terraformStateKey(context.data, name);
  });
};
