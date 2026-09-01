/**
 * Adapts the Nx init executor contract to the shared dx-tasks dispatcher.
 */

import { PromiseExecutor } from "@nx/devkit";
import { createDefaultTaskDispatcher } from "@pagopa/dx-tasks/default-dispatcher";

import { configureLogger, getPackageLogger } from "../../logger.ts";
import { type InitExecutorInput, initExecutorSchema } from "./schema.ts";

const runExecutor: PromiseExecutor<InitExecutorInput> = async (options) => {
  const logger = getPackageLogger(["init"]);
  const parseResult = initExecutorSchema.safeParse(options);

  await configureLogger();

  if (!parseResult.success) {
    logger.error("Invalid init options", {
      issues: parseResult.error.issues,
      path: options.projectRoot ?? "init options",
    });
    return {
      success: false,
    };
  }

  const { args, frozenLockfile, projectRoot } = parseResult.data;
  const dispatcher = createDefaultTaskDispatcher();
  try {
    await dispatcher.dispatchTask("terraformInit", {
      args,
      frozenLockfile,
      modulePath: projectRoot,
    });
  } catch (error) {
    logger.error("Terraform init failed", {
      error,
      path: projectRoot,
    });
    return {
      success: false,
    };
  }

  return {
    success: true,
  };
};

export default runExecutor;
