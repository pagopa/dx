/** Validates explicit GitHub Action inputs for the deterministic preflight. */

import { z } from "zod";

export const actionInputsSchema = z.object({
  azureSubscriptionId: z.string().min(1, "azure-subscription-id is required"),
  cdIdentityName: z.string().min(1, "cd-identity-name is required"),
  cdIdentityResourceGroupName: z
    .string()
    .min(1, "cd-identity-resource-group-name is required"),
  outputFile: z.string().min(1, "output-file is required"),
  terraformPlanPath: z.string().min(1, "terraform-plan-path is required"),
  workingDirectory: z.string().min(1, "working-directory is required"),
});

export type ActionInputs = z.infer<typeof actionInputsSchema>;

export const parseActionInputs = (input: unknown): ActionInputs => {
  const result = actionInputsSchema.safeParse(input);
  if (!result.success) {
    throw new Error(z.prettifyError(result.error));
  }
  return result.data;
};
