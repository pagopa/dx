/** This module exposes built-in dx-tasks task definitions for external registries. */

import type { TaskDefinition } from "./dispatcher.ts";

import {
  prComment,
  type PrCommentPayload,
  payloadSchema as prCommentPayloadSchema,
  type PrCommentResult,
} from "./github/pr-comment.ts";
import {
  renderReport,
  type RenderReportPayload,
  payloadSchema as renderReportPayloadSchema,
} from "./render-report.ts";
import {
  reportPrComment,
  type ReportPrCommentPayload,
  payloadSchema as reportPrCommentPayloadSchema,
} from "./report-pr-comment.ts";
import {
  terraformApply,
  type TerraformApplyPayload,
  payloadSchema as terraformApplyPayloadSchema,
} from "./terraform/apply.ts";
import {
  terraformPlanUpload,
  type TerraformPlanUploadPayload,
  payloadSchema as terraformPlanUploadPayloadSchema,
} from "./terraform/plan-upload.ts";
import {
  terraformPlan,
  type TerraformPlanPayload,
  payloadSchema as terraformPlanPayloadSchema,
} from "./terraform/plan.ts";

export const terraformPlanTask: TaskDefinition<TerraformPlanPayload> = {
  name: "terraformPlan",
  payloadSchema: terraformPlanPayloadSchema,
  run: terraformPlan,
};

export const terraformPlanUploadTask: TaskDefinition<TerraformPlanUploadPayload> =
  {
    name: "terraformPlanUpload",
    payloadSchema: terraformPlanUploadPayloadSchema,
    run: terraformPlanUpload,
  };

export const terraformApplyTask: TaskDefinition<TerraformApplyPayload> = {
  name: "terraformApply",
  payloadSchema: terraformApplyPayloadSchema,
  run: terraformApply,
};

export const renderReportTask: TaskDefinition<RenderReportPayload> = {
  name: "renderReport",
  payloadSchema: renderReportPayloadSchema,
  run: renderReport,
};

export const reportPrCommentTask: TaskDefinition<
  ReportPrCommentPayload,
  PrCommentResult | undefined
> = {
  name: "reportPrComment",
  payloadSchema: reportPrCommentPayloadSchema,
  run: reportPrComment,
};

export const prCommentTask: TaskDefinition<PrCommentPayload, PrCommentResult> =
  {
    name: "prComment",
    payloadSchema: prCommentPayloadSchema,
    run: prComment,
  };
