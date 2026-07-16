/**
 * @fileoverview Terraform Plan Storage Upload action adapter.
 *
 * Validates GitHub Action inputs and delegates plan bundle storage to dx-tasks.
 */

import * as core from "@actions/core";
import { uploadPlanBundle } from "@pagopa/dx-tasks/terraform-plan-storage";
import path from "node:path";

import { InputsSchema } from "./schema.js";

const setEmptyAzureOutputs = (): void => {
  core.setOutput("azure-storage-account", "");
  core.setOutput("azure-container", "");
};

const setEmptyAwsOutputs = (): void => {
  core.setOutput("aws-bucket", "");
  core.setOutput("aws-region", "");
};

async function run(): Promise<void> {
  const parseResult = InputsSchema.safeParse({
    "plan-file": core.getInput("plan-file"),
    "working-directory": core.getInput("working-directory"),
  });

  if (!parseResult.success) {
    throw new Error(
      parseResult.error.issues.map((issue) => issue.message).join("; "),
    );
  }

  const runId = process.env["GITHUB_RUN_ID"];
  if (!runId) {
    throw new Error("GITHUB_RUN_ID environment variable is not set");
  }

  const workingDirectory = path.isAbsolute(
    parseResult.data["working-directory"],
  )
    ? parseResult.data["working-directory"]
    : path.resolve(
        process.env["GITHUB_WORKSPACE"] ?? process.cwd(),
        parseResult.data["working-directory"],
      );
  const { backend, planPath } = await uploadPlanBundle({
    planFile: parseResult.data["plan-file"],
    runId,
    workingDirectory,
  });

  core.setOutput("plan-path", planPath);
  switch (backend.type) {
    case "azurerm":
      core.setOutput("provider", "azure");
      core.setOutput("azure-storage-account", backend.storageAccount);
      core.setOutput("azure-container", backend.container);
      setEmptyAwsOutputs();
      break;
    case "s3":
      core.setOutput("provider", "aws");
      core.setOutput("aws-bucket", backend.bucket);
      core.setOutput("aws-region", backend.region);
      setEmptyAzureOutputs();
      break;
  }
}

run().catch(core.setFailed);
