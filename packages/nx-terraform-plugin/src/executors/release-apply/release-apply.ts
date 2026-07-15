import { PromiseExecutor } from "@nx/devkit";
import { createDefaultTaskDispatcher } from "@pagopa/dx-tasks/default-dispatcher";
import { z } from "zod/v4";

import { configureLogger, getPackageLogger } from "../../logger.ts";
import {
  type ReleaseApplyExecutorInput,
  releaseApplyExecutorSchema,
} from "./schema.ts";

const nxDryRunSchema = z.enum(["false", "true"]).optional();

const runExecutor: PromiseExecutor<ReleaseApplyExecutorInput> = async (
  options,
) => {
  const logger = getPackageLogger(["release-apply"]);
  const parseResult = releaseApplyExecutorSchema.safeParse(options);
  const nxDryRunParseResult = nxDryRunSchema.safeParse(process.env.NX_DRY_RUN);

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

  if (!nxDryRunParseResult.success) {
    logger.warn("Invalid NX_DRY_RUN environment variable", {
      issues: nxDryRunParseResult.error.issues,
    });
    return {
      success: false,
    };
  }

  const { dryRun, projectRoot, report, sensitiveKeys, verbose } =
    parseResult.data;

  if (dryRun || nxDryRunParseResult.data === "true") {
    logger.info("Skipping Terraform apply during release dry run", {
      projectRoot,
    });
    return {
      success: true,
    };
  }

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
