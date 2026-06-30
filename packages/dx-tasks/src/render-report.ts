/** This module renders persisted dx-tasks reports and prints them to stdout. */

import * as z from "zod/mini";

import type { TaskRunContext } from "./dispatcher.ts";

const renderReportPayloadShape = {
  format: z._default(z.literal("markdown"), "markdown"),
};

export const payloadSchema = z.object(renderReportPayloadShape);

export interface RenderReportPayload {
  format?: "markdown";
}

export async function renderReport(
  { format = "markdown" }: RenderReportPayload,
  context: TaskRunContext = {},
) {
  if (!context.reports) {
    throw new Error("renderReport requires reports in the task context");
  }

  const renderedReport = await context.reports.render(format);

  console.log(renderedReport);
}
