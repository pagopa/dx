/**
 * Terraform state key helper.
 *
 * The state storage account is already scoped by prefix and environment, so
 * keys never repeat the prefix:
 *
 * - workspace-scoped entries follow the domain/scope.tfstate convention;
 * - shared scopes (such as the core) live at the root of the container, because
 *   they are shared across workspace domains.
 */
import { type NodePlopAPI } from "node-plop";
import { z } from "zod";

import { CORE_STATE_SCOPE } from "../../../domain/environment.js";
import { payloadSchema } from "../generators/environment/prompts.js";

const terraformStateContextSchema = payloadSchema.pick({
  workspace: true,
});

const sharedStateScopes = new Set<string>([CORE_STATE_SCOPE]);

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

  // Shared scopes are not bound to a workspace domain: the state storage
  // account is already scoped by prefix and environment, and several domains
  // may share the same core.
  if (sharedStateScopes.has(parsedName.data)) {
    return `${parsedName.data}.tfstate`;
  }

  return `${context.workspace.domain}/${parsedName.data}.tfstate`;
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
