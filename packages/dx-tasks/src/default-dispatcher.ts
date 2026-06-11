/** This module wires the default dx-tasks registry with built-in task definitions. */

import { createTaskDispatcher, type TaskDispatcher } from "./dispatcher.ts";
import { Reporter } from "./reporter.ts";
import { terraformPlanTask } from "./tasks.ts";

export interface DefaultTaskDispatcherOptions {
  reporter?: Reporter;
}

export const createDefaultTaskDispatcher = ({
  reporter = new Reporter(process.cwd()),
}: DefaultTaskDispatcherOptions = {}): TaskDispatcher => {
  const dispatcher = createTaskDispatcher({
    context: { reporter },
  });
  dispatcher.registerTask(terraformPlanTask);

  return dispatcher;
};
