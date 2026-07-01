/** This module wires the default dx-tasks registry with built-in task definitions. */

import { createTaskDispatcher, type TaskDispatcher } from "./dispatcher.ts";
import { ReportStore } from "./report-store.ts";
import {
  prCommentTask,
  renderReportTask,
  reportPrCommentTask,
  terraformPlanTask,
  terraformRbacPreflightTask,
} from "./tasks.ts";
import { terraformPlanReportNamespace } from "./terraform/plan.ts";

export interface DefaultTaskDispatcherOptions {
  reports?: ReportStore;
}

const createDefaultReportStore = (): ReportStore =>
  new ReportStore(process.cwd()).register(terraformPlanReportNamespace);

export const createDefaultTaskDispatcher = ({
  reports = createDefaultReportStore(),
}: DefaultTaskDispatcherOptions = {}): TaskDispatcher => {
  const dispatcher = createTaskDispatcher({ context: { reports } });
  dispatcher.registerTask(terraformPlanTask);
  dispatcher.registerTask(terraformRbacPreflightTask);
  dispatcher.registerTask(renderReportTask);
  dispatcher.registerTask(reportPrCommentTask);
  dispatcher.registerTask(prCommentTask);

  return dispatcher;
};
