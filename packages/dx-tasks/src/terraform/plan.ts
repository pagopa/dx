/** This module runs Terraform plans for dx-tasks without external process helpers. */

import fs from "node:fs/promises";
import util from "node:util";
import * as z from "zod/mini";

import type { TaskRunContext } from "../dispatcher.ts";
import type { ReportNamespace, ReportRenderContext } from "../report-store.ts";
import type { ProcessResult } from "../run-command.ts";

import { runCommand } from "../run-command.ts";
import { maskOutput } from "./mask-output.ts";

export const TERRAFORM_PLAN_NAMESPACE = "terraform-plan";

const terraformPlanPayloadShape = {
  modulePath: z.string().check(z.minLength(1)),
  out: z.optional(z.string().check(z.minLength(1))),
  refresh: z._default(z.boolean(), true),
  report: z._default(z.boolean(), false),
  verbose: z._default(z.boolean(), false),
};

export const payloadSchema = z.object(terraformPlanPayloadShape);

export interface TerraformPlanPayload {
  modulePath: string;
  out?: string;
  refresh?: boolean;
  report?: boolean;
  verbose?: boolean;
}

const terraformPlanReportShape = {
  modulePath: z.string().check(z.minLength(1)),
  notices: z.array(
    z.object({
      message: z.string().check(z.minLength(1)),
      severity: z.union([z.literal("warning"), z.literal("error")]),
    }),
  ),
  planOutput: z.string(),
  success: z._default(z.boolean(), true),
  summaryLine: z.optional(z.string().check(z.minLength(1))),
};

export const terraformPlanReportSchema = z.object(terraformPlanReportShape);

export interface TerraformPlanNotice {
  message: string;
  severity: "error" | "warning";
}

export interface TerraformPlanReport {
  modulePath: string;
  notices: readonly TerraformPlanNotice[];
  planOutput: string;
  success: boolean;
  summaryLine?: string;
}

const noPlanOutputMessage = "No plan output available.";
const terraformPlanReportSeparator = "\n\n";

// CI step logs can truncate output for large plans; this limit keeps each plan's
// console output well within safe bounds while leaving room for task runner overhead.
const PLAN_CONSOLE_MAX_CHARS = 50_000;

// Appends the full Terraform plan output to a summary file as a collapsible
// <details> block. No-ops when summaryFilePath is not provided.
// Errors are swallowed since this is best-effort; the report artifact and console log remain available.
export const appendPlanOutputToSummary = async (
  summaryFilePath: string | undefined,
  modulePath: string,
  strippedOutput: string,
): Promise<void> => {
  if (!summaryFilePath) {
    return;
  }

  const markdown = `### Terraform Plan: \`${modulePath}\`\n\n<details><summary>Show Plan</summary>\n\n\`\`\`\n${strippedOutput}\n\`\`\`\n\n</details>\n\n`;

  try {
    await fs.appendFile(summaryFilePath, markdown, "utf8");
  } catch (e) {
    console.warn("Failed to write Terraform plan output summary", e);
  }
};

// Truncates plan output to maxChars for console logging. When the output exceeds the limit,
// replaces it with the summary line and a notice pointing users to the output summary file.
export const truncateForConsoleLog = (
  output: string,
  summaryLine: string | undefined,
  maxChars: number,
  shouldTruncate: boolean,
  hasSummaryFile: boolean,
): string => {
  if (!shouldTruncate || output.length <= maxChars) {
    return output;
  }

  const truncationTarget = hasSummaryFile
    ? "See the plan output summary for the full output."
    : "See the plan report artifacts for the full output.";

  return `${summaryLine ?? noPlanOutputMessage}\n\n[Plan output truncated. ${truncationTarget}]`;
};

const renderTerraformPlanReports = (
  reports: readonly TerraformPlanReport[],
  { sourceUrl }: ReportRenderContext = {},
): string =>
  reports
    .map((report) => renderTerraformPlanReport(report, { sourceUrl }))
    .join(terraformPlanReportSeparator)
    .trim();

const renderPlanOutputReference = (sourceUrl?: string): string => {
  const reference = sourceUrl
    ? `See the [workflow run](${sourceUrl}) logs or downloaded Terraform plan report artifacts for the complete output.`
    : "See the workflow run logs or downloaded Terraform plan report artifacts for the complete output.";

  return `> [!NOTE]\n> Full plan output is not included in this comment.\n> ${reference}`;
};

const renderTerraformPlanReport = (
  { modulePath, notices, success, summaryLine }: TerraformPlanReport,
  { sourceUrl }: { sourceUrl?: string },
): string => {
  const status = success ? "✅ Success" : "❌ Failed";
  const heading = `### Terraform Plan: \`${modulePath}\` - ${status}`;
  const renderedNotices = notices.map(renderNoticeMarkdown);
  const details = renderPlanOutputReference(sourceUrl);

  if (renderedNotices.length > 0) {
    const noticeSection = renderedNotices.join("\n\n");
    const summarySection = summaryLine ? `\n\n${summaryLine}` : "";

    return `${heading}\n${noticeSection}${summarySection}\n\n${details}`;
  }

  const summarySection = summaryLine ? `\n${summaryLine}` : "";

  return `${heading}${summarySection}\n\n${details}`;
};

export const terraformPlanReportNamespace: ReportNamespace<
  typeof terraformPlanReportSchema
> = {
  name: TERRAFORM_PLAN_NAMESPACE,
  renderers: {
    markdown: renderTerraformPlanReports,
  },
  schema: terraformPlanReportSchema,
};

const isRunningInCI = (): boolean => {
  const ci = process.env.CI;

  return Boolean(ci) && ci !== "false" && ci !== "0";
};

const getMaskedOutputOrFallback = (maskedOutput: string): string =>
  maskedOutput.trim().length > 0 ? maskedOutput : noPlanOutputMessage;

const getPlanOutput = (maskedOutput: string, verbose: boolean): string => {
  if (verbose) {
    return getMaskedOutputOrFallback(maskedOutput);
  }

  const match = maskedOutput.match(
    /(?:^.*Terraform will perform the following actions:[\s\S]*|^.*Terraform planned the following actions, but then encountered a problem:[\s\S]*|^.*No changes\..*)/m,
  );

  return match?.[0] ?? getMaskedOutputOrFallback(maskedOutput);
};

const getPlanSummaryLine = (maskedOutput: string): string | undefined =>
  util.stripVTControlCharacters(maskedOutput).match(/^Plan:\s+.+$/m)?.[0];

const noticeStartPattern = /^(?:│\s*)?(Warning|Error):/;

const getNoticeSeverity = (
  line: string,
): TerraformPlanNotice["severity"] | undefined => {
  const [, severity] = noticeStartPattern.exec(line) ?? [];

  if (severity === "Warning") {
    return "warning";
  }
  if (severity === "Error") {
    return "error";
  }

  return undefined;
};

const isPlanSectionStart = (line: string): boolean =>
  /^(?:Terraform used the selected providers|Terraform will perform the following actions:|Terraform planned the following actions, but then encountered a problem:|No changes\.|Plan:\s+)/.test(
    line,
  );

const normalizeNoticeLine = (line: string): string => line.replace(/^│ ?/, "");

const getPlanNotices = (
  maskedOutput: string,
): readonly TerraformPlanNotice[] => {
  const lines = util.stripVTControlCharacters(maskedOutput).split(/\r?\n/);
  const notices: TerraformPlanNotice[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const severity = getNoticeSeverity(lines[lineIndex] ?? "");

    if (!severity) {
      continue;
    }

    const messageLines: string[] = [];

    for (
      let noticeLineIndex = lineIndex;
      noticeLineIndex < lines.length;
      noticeLineIndex += 1
    ) {
      const line = lines[noticeLineIndex] ?? "";
      const isFirstLine = noticeLineIndex === lineIndex;

      if (!isFirstLine && getNoticeSeverity(line)) {
        lineIndex = noticeLineIndex - 1;
        break;
      }

      if (!isFirstLine && (line === "╵" || isPlanSectionStart(line))) {
        lineIndex = noticeLineIndex - 1;
        break;
      }

      messageLines.push(normalizeNoticeLine(line));
      lineIndex = noticeLineIndex;
    }

    const message = messageLines.join("\n").trim();

    if (message.length > 0) {
      notices.push({
        message,
        severity,
      });
    }
  }

  return notices;
};

const renderNoticeMarkdown = ({ message, severity }: TerraformPlanNotice) => {
  const label = severity === "warning" ? "WARNING" : "CAUTION";
  const quotedMessage = message
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

  return `> [!${label}]\n${quotedMessage}`;
};

const getFailureMessage = (result: ProcessResult): string => {
  if (result.signal) {
    return `Terraform plan terminated by signal ${result.signal}`;
  }
  if (result.exitCode !== 0) {
    return `Terraform plan exited with code ${result.exitCode}`;
  }
  return noPlanOutputMessage;
};

const executeTerraformPlan = async (
  modulePath: string,
  env: Record<string, string>,
  verbose: boolean,
  report: boolean,
  summaryFilePath: string | undefined,
  shouldTruncate: boolean,
  context: TaskRunContext,
) => {
  const result = await runCommand("terraform", ["plan"], modulePath, env);

  if (result.signal) {
    throw new Error(getFailureMessage(result));
  }

  const maskedOutput = maskOutput(
    [result.stdout, result.stderr]
      .filter((output) => output.trim().length > 0)
      .join("\n"),
  );

  const planOutput = getPlanOutput(maskedOutput, verbose);
  const notices = getPlanNotices(maskedOutput);
  const summaryLine = getPlanSummaryLine(maskedOutput);
  // Strip ANSI codes once and reuse for both the Step Summary and the report artifact.
  const strippedOutput = util.stripVTControlCharacters(planOutput);

  await appendPlanOutputToSummary(summaryFilePath, modulePath, strippedOutput);

  console.log(
    truncateForConsoleLog(
      planOutput,
      summaryLine,
      PLAN_CONSOLE_MAX_CHARS,
      shouldTruncate,
      Boolean(summaryFilePath),
    ),
  );

  if (report && context.reports) {
    await context.reports.write(
      TERRAFORM_PLAN_NAMESPACE,
      Buffer.from(modulePath).toString("base64url"),
      {
        modulePath,
        notices,
        planOutput: strippedOutput,
        success: result.exitCode === 0,
        ...(summaryLine ? { summaryLine } : {}),
      },
    );
  }

  if (result.exitCode !== 0) {
    throw new Error(getFailureMessage(result));
  }
};

export async function terraformPlan(
  {
    modulePath,
    out,
    refresh = true,
    report = false,
    verbose = false,
  }: TerraformPlanPayload,
  context: TaskRunContext = {},
) {
  const args = new Map<string, string | true>();
  const env: Record<string, string> = {};
  const runningInCI = isRunningInCI();

  args.set("lock-timeout", "120s");

  if (out) {
    args.set("out", out);
  }

  if (!refresh) {
    args.set("refresh", "false");
    args.set("lock", "false");
  }

  if (!verbose) {
    env.TF_IN_AUTOMATION = "true";
  }

  if (runningInCI) {
    args.set("input", "false");
    args.set("no-color", true);
    env.TF_IN_AUTOMATION = "true";
  }

  env.TF_CLI_ARGS_plan = args
    .entries()
    .reduce(
      (acc, [key, value]) =>
        `${acc}-${key}${value === true ? "" : `=${value}`} `,
      "",
    );

  await executeTerraformPlan(
    modulePath,
    env,
    verbose,
    report,
    process.env.GITHUB_STEP_SUMMARY,
    runningInCI,
    context,
  );
}
