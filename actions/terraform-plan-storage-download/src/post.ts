/**
 * @fileoverview Terraform Plan Storage Download post-action adapter.
 *
 * Deletes the downloaded remote plan bundle through dx-tasks after job completion.
 */

import * as core from "@actions/core";
import {
  deleteRemotePlanBundle,
  type PlanStorageBackend,
} from "@pagopa/dx-tasks/terraform-plan-storage";

import { type PostState, PostStateSchema } from "./schema.js";

const getBackend = (state: PostState): PlanStorageBackend => {
  switch (state.provider) {
    case "aws":
      return {
        bucket: state["aws-bucket"],
        region: state["aws-region"],
        type: "s3",
      };
    case "azure":
      return {
        container: state["azure-container"],
        storageAccount: state["azure-storage-account"],
        type: "azurerm",
      };
  }
};

async function run(): Promise<void> {
  const parseResult = PostStateSchema.safeParse({
    "aws-bucket": core.getState("aws-bucket"),
    "aws-region": core.getState("aws-region"),
    "azure-container": core.getState("azure-container"),
    "azure-storage-account": core.getState("azure-storage-account"),
    "plan-path": core.getState("plan-path"),
    provider: core.getState("provider"),
  });

  if (!parseResult.success) {
    throw new Error(
      parseResult.error.issues.map((issue) => issue.message).join("; "),
    );
  }

  await deleteRemotePlanBundle({
    backend: getBackend(parseResult.data),
    planPath: parseResult.data["plan-path"],
  });
}

run().catch(core.setFailed);
