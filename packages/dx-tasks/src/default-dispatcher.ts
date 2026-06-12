/** This module wires the default dx-tasks registry with built-in task definitions. */

import {
  createTaskDispatcher,
  type TaskDefinition,
  type TaskDispatcher,
} from "./dispatcher.ts";
import {
  terraformPlan,
  type TerraformPlanPayload,
  payloadSchema as terraformPlanPayloadSchema,
} from "./terraform-plan.ts";

export const terraformPlanTask: TaskDefinition<TerraformPlanPayload> = {
  name: "terraformPlan",
  payloadSchema: terraformPlanPayloadSchema,
  run: terraformPlan,
};

export const createDefaultTaskDispatcher = (): TaskDispatcher => {
  const dispatcher = createTaskDispatcher();
  dispatcher.registerTask(terraformPlanTask);

  return dispatcher;
};
