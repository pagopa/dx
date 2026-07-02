/** This module renders persisted dx-tasks reports and posts them as GitHub PR comments. */

import * as z from "zod/mini";

import type { TaskRunContext } from "./dispatcher.ts";
import type {
  GitHubPrCommentClientFactory,
  PrCommentResult,
} from "./github/pr-comment.ts";

import { prComment } from "./github/pr-comment.ts";

const nonEmptyStringSchema = z.string().check(z.minLength(1));

const reportPrCommentPayloadShape = {
  footer: z.optional(nonEmptyStringSchema),
  format: z._default(z.literal("markdown"), "markdown"),
  githubToken: z.optional(nonEmptyStringSchema),
  issueNumber: z.number().check(z.int(), z.positive()),
  owner: nonEmptyStringSchema,
  repo: nonEmptyStringSchema,
  searchPattern: z.optional(nonEmptyStringSchema),
  sourceUrl: z.optional(nonEmptyStringSchema),
  title: z.optional(nonEmptyStringSchema),
};

export const payloadSchema = z.object(reportPrCommentPayloadShape);

export interface ReportPrCommentPayload {
  footer?: string;
  format?: "markdown";
  githubToken?: string;
  issueNumber: number;
  owner: string;
  repo: string;
  searchPattern?: string;
  sourceUrl?: string;
  title?: string;
}

export async function reportPrComment(
  {
    footer,
    format = "markdown",
    githubToken,
    issueNumber,
    owner,
    repo,
    searchPattern,
    sourceUrl,
    title,
  }: ReportPrCommentPayload,
  context: TaskRunContext = {},
  createClient?: GitHubPrCommentClientFactory,
): Promise<PrCommentResult | undefined> {
  if (!context.reports) {
    throw new Error("reportPrComment requires reports in the task context");
  }

  const renderedReport = await context.reports.render(format, { sourceUrl });

  if (renderedReport.trim().length === 0) {
    return undefined;
  }

  return prComment(
    {
      commentBody: renderedReport,
      footer,
      githubToken,
      issueNumber,
      owner,
      repo,
      searchPattern,
      title,
    },
    context,
    createClient,
  );
}
