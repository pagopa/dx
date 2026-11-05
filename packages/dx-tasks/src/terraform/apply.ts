/** Runs Terraform applies, masking saved-plan output while preserving interactive local applies. */

import { z } from "zod/v4";

import { runCommand } from "../run-command.ts";
import { maskOutput } from "./mask-output.ts";

export const payloadSchema = z.object({
  modulePath: z.string().min(1),
  planFile: z.string().min(1).optional(),
});

export type TerraformApplyPayload = z.infer<typeof payloadSchema>;

export const terraformApply = async ({
  modulePath,
  planFile,
}: TerraformApplyPayload): Promise<void> => {
  const args = planFile
    ? ["apply", "-input=false", "-no-color", "-lock-timeout=120s", planFile]
    : ["apply"];
  // Interactive Terraform prompts must be visible before the command completes.
  const result = await runCommand("terraform", args, modulePath, {}, !planFile);

  if (planFile) {
    console.log(maskOutput([result.stdout, result.stderr].join("\n").trim()));
  }

  if (result.signal) {
    throw new Error(`Terraform apply terminated by signal ${result.signal}`);
  }
  if (result.exitCode !== 0) {
    throw new Error(`Terraform apply exited with code ${result.exitCode}`);
  }
};
