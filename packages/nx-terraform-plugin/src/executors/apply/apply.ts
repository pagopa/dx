/** Adapts Nx apply options to the shared Terraform apply task. */

import { PromiseExecutor } from "@nx/devkit";
import { createDefaultTaskDispatcher } from "@pagopa/dx-tasks/default-dispatcher";

import { configureLogger, getPackageLogger } from "../../logger.ts";
import { type ApplyExecutorInput, applyExecutorSchema } from "./schema.ts";

const runExecutor: PromiseExecutor<ApplyExecutorInput> = async (options) => {
  await configureLogger();
  const parsed = applyExecutorSchema.safeParse(options);
  if (!parsed.success) {
    getPackageLogger(["apply"]).warn("Invalid apply options", {
      issues: parsed.error.issues,
    });
    return { success: false };
  }

  await createDefaultTaskDispatcher().dispatchTask("terraformApply", {
    modulePath: parsed.data.projectRoot,
    planFile: parsed.data.planFile,
  });
  return { success: true };
};

export default runExecutor;
