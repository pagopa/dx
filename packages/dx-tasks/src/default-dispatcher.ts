/** This module wires the default dx-tasks registry with built-in task definitions. */

import { createTaskDispatcher, type TaskDispatcher } from "./dispatcher.ts";
import { ReportStore } from "./report-store.ts";
import {
  prCommentTask,
  renderReportTask,
  reportPrCommentTask,
  terraformApplyTask,
  terraformPlanTask,
  terraformPlanUploadTask,
  validateTerraformEnvironmentReleaseTask,
} from "./tasks.ts";
import { terraformApplyReportNamespace } from "./terraform/apply.ts";
import { terraformPlanReportNamespace } from "./terraform/plan.ts";

export interface DefaultTaskDispatcherOptions {
  githubToken?: string;
  reports?: ReportStore;
}

const createDefaultReportStore = (): ReportStore =>
  new ReportStore(process.cwd())
    .register(terraformPlanReportNamespace)
    .register(terraformApplyReportNamespace);

export const createDefaultTaskDispatcher = ({
  githubToken,
  reports = createDefaultReportStore(),
}: DefaultTaskDispatcherOptions = {}): TaskDispatcher => {
  const dispatcher = createTaskDispatcher({
    context: { githubToken, reports },
  });
  dispatcher.registerTask(terraformPlanTask);
  dispatcher.registerTask(terraformPlanUploadTask);
  dispatcher.registerTask(terraformApplyTask);
  dispatcher.registerTask(renderReportTask);
  dispatcher.registerTask(reportPrCommentTask);
  dispatcher.registerTask(prCommentTask);
  dispatcher.registerTask(validateTerraformEnvironmentReleaseTask);

  return dispatcher;
};
