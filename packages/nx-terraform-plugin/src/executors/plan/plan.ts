import { PromiseExecutor } from "@nx/devkit";
import { createDefaultTaskDispatcher } from "@pagopa/dx-tasks/default-dispatcher";

import { configureLogger, getPackageLogger } from "../../logger.ts";
import { type PlanExecutorInput, planExecutorSchema } from "./schema.ts";

const runExecutor: PromiseExecutor<PlanExecutorInput> = async (options) => {
  const logger = getPackageLogger(["plan"]);
  const parseResult = planExecutorSchema.safeParse(options);

  await configureLogger();

  if (!parseResult.success) {
    logger.warn("Invalid plan options", {
      issues: parseResult.error.issues,
      path: options.projectRoot ?? "plan options",
    });
    return {
      success: false,
    };
  }

  const { out, projectRoot, refresh, report, sensitiveKeys, verbose } =
    parseResult.data;

  const dispatcher = createDefaultTaskDispatcher();

  await dispatcher.dispatchTask("terraformPlan", {
    modulePath: projectRoot,
    out,
    refresh,
    report,
    sensitiveKeys,
    verbose,
  });

  return {
    success: true,
  };
};

export default runExecutor;
