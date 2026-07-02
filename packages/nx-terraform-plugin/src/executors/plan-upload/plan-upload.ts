import { PromiseExecutor } from "@nx/devkit";
import { createDefaultTaskDispatcher } from "@pagopa/dx-tasks/default-dispatcher";

import { configureLogger, getPackageLogger } from "../../logger.ts";
import {
  type PlanUploadExecutorInput,
  planUploadExecutorSchema,
} from "./schema.ts";

const runExecutor: PromiseExecutor<PlanUploadExecutorInput> = async (
  options,
) => {
  const logger = getPackageLogger(["plan-upload"]);
  const parseResult = planUploadExecutorSchema.safeParse(options);

  await configureLogger();

  if (!parseResult.success) {
    logger.warn("Invalid plan-upload options", {
      issues: parseResult.error.issues,
      path: options?.projectRoot ?? "plan-upload options",
    });
    return {
      success: false,
    };
  }

  const { projectRoot, refresh, report, verbose } = parseResult.data;

  const dispatcher = createDefaultTaskDispatcher();

  await dispatcher.dispatchTask("terraformPlanUpload", {
    modulePath: projectRoot,
    refresh,
    report,
    verbose,
  });

  return {
    success: true,
  };
};

export default runExecutor;
