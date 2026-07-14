import { PromiseExecutor } from "@nx/devkit";
import { createDefaultTaskDispatcher } from "@pagopa/dx-tasks/default-dispatcher";

import { configureLogger, getPackageLogger } from "../../logger.ts";
import {
  type ReleaseApplyExecutorInput,
  releaseApplyExecutorSchema,
} from "./schema.ts";

const runExecutor: PromiseExecutor<ReleaseApplyExecutorInput> = async (
  options,
) => {
  const logger = getPackageLogger(["release-apply"]);
  const parseResult = releaseApplyExecutorSchema.safeParse(options);

  await configureLogger();

  if (!parseResult.success) {
    logger.warn("Invalid release-apply options", {
      issues: parseResult.error.issues,
      path: options?.projectRoot ?? "release-apply options",
    });
    return {
      success: false,
    };
  }

  const { projectRoot, report, sensitiveKeys, verbose } = parseResult.data;

  const dispatcher = createDefaultTaskDispatcher();

  await dispatcher.dispatchTask("terraformApply", {
    modulePath: projectRoot,
    report,
    sensitiveKeys,
    verbose,
  });

  return {
    success: true,
  };
};

export default runExecutor;
