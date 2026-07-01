/** This module runs a Terraform plan and uploads the resulting bundle for a later apply. */

import * as z from "zod/mini";

import type { TaskRunContext } from "../dispatcher.ts";

import { PLAN_FILE_NAME } from "./plan-file.ts";
import { uploadPlanBundle } from "./plan-storage.ts";
import { terraformPlan } from "./plan.ts";

const terraformPlanUploadPayloadShape = {
  modulePath: z.string().check(z.minLength(1)),
  refresh: z._default(z.boolean(), true),
  report: z._default(z.boolean(), false),
  verbose: z._default(z.boolean(), false),
};

export const payloadSchema = z.object(terraformPlanUploadPayloadShape);

export interface TerraformPlanUploadPayload {
  modulePath: string;
  refresh?: boolean;
  report?: boolean;
  verbose?: boolean;
}

const getRunId = (): string => {
  const runId = process.env.GITHUB_RUN_ID;

  if (!runId) {
    throw new Error(
      "GITHUB_RUN_ID environment variable is required to upload a Terraform plan bundle",
    );
  }

  return runId;
};

export async function terraformPlanUpload(
  {
    modulePath,
    refresh = true,
    report = false,
    verbose = false,
  }: TerraformPlanUploadPayload,
  context: TaskRunContext = {},
) {
  await terraformPlan(
    { modulePath, out: PLAN_FILE_NAME, refresh, report, verbose },
    context,
  );

  const runId = getRunId();
  const { backend, planPath } = await uploadPlanBundle({
    planFile: PLAN_FILE_NAME,
    runId,
    workingDirectory: modulePath,
  });

  console.log(
    `Uploaded Terraform plan bundle for "${modulePath}" (${backend.type}) to "${planPath}"`,
  );
}
