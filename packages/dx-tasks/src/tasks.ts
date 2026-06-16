/** This module exposes built-in dx-tasks task definitions for external registries. */

import type { TaskDefinition } from "./dispatcher.ts";

import {
  renderReport,
  type RenderReportPayload,
  payloadSchema as renderReportPayloadSchema,
} from "./render-report.ts";
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

export const renderReportTask: TaskDefinition<RenderReportPayload> = {
  name: "renderReport",
  payloadSchema: renderReportPayloadSchema,
  run: renderReport,
};
