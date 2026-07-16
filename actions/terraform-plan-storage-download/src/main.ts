/**
 * @fileoverview Terraform Plan Storage Download action adapter.
 *
 * Validates GitHub Action inputs and delegates plan bundle retrieval to dx-tasks.
 */

import * as core from "@actions/core";
import {
  downloadPlanBundle,
  type PlanStorageBackend,
} from "@pagopa/dx-tasks/terraform-plan-storage";
import path from "node:path";

import { type Context, ContextSchema } from "./schema.js";

const getBackend = (context: Context): PlanStorageBackend => {
  switch (context.provider) {
    case "aws":
      return {
        bucket: context["aws-bucket"],
        region: context["aws-region"],
        type: "s3",
      };
    case "azure":
      return {
        container: context["azure-container"],
        storageAccount: context["azure-storage-account"],
        type: "azurerm",
      };
  }
};

const savePostState = (context: Context): void => {
  core.saveState("provider", context.provider);
  core.saveState("plan-path", context["plan-path"]);

  if (context.provider === "azure") {
    core.saveState("azure-storage-account", context["azure-storage-account"]);
    core.saveState("azure-container", context["azure-container"]);
  } else {
    core.saveState("aws-bucket", context["aws-bucket"]);
    core.saveState("aws-region", context["aws-region"]);
  }
};

async function run(): Promise<void> {
  const parseResult = ContextSchema.safeParse({
    "aws-bucket": core.getInput("aws-bucket"),
    "aws-region": core.getInput("aws-region"),
    "azure-container": core.getInput("azure-container"),
    "azure-storage-account": core.getInput("azure-storage-account"),
    "plan-path": core.getInput("plan-path"),
    provider: core.getInput("provider"),
    "working-directory": core.getInput("working-directory"),
  });

  if (!parseResult.success) {
    throw new Error(
      parseResult.error.issues.map((issue) => issue.message).join("; "),
    );
  }

  const context = parseResult.data;
  const workingDirectory = path.isAbsolute(context["working-directory"])
    ? context["working-directory"]
    : path.resolve(
        process.env["GITHUB_WORKSPACE"] ?? process.cwd(),
        context["working-directory"],
      );

  savePostState(context);
  await downloadPlanBundle({
    backend: getBackend(context),
    planPath: context["plan-path"],
    workingDirectory,
  });
}

run().catch(core.setFailed);
