/** This module exposes built-in dx-tasks task definitions for external registries. */

import type { TaskDefinition } from "./dispatcher.ts";

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
