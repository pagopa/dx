/** This module runs Terraform plans for dx-tasks without external process helpers. */

import util from "node:util";
import * as z from "zod/mini";

import type { TaskRunContext } from "../dispatcher.ts";
import type { ReportNamespace } from "../report-store.ts";
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

const renderTerraformPlanReports = (
  reports: readonly TerraformPlanReport[],
): string => reports.map(renderTerraformPlanReport).join("\n\n").trim();

const renderTerraformPlanReport = ({
  modulePath,
  notices,
  planOutput,
  success,
  summaryLine,
}: TerraformPlanReport): string => {
  const status = success ? "✅ Success" : "❌ Failed";
  const heading = `### Terraform Plan: \`${modulePath}\` - ${status}`;
  const renderedNotices = notices.map(renderNoticeMarkdown);
  const details = `<details>
<summary>Show full plan</summary>

\`\`\`hcl
${planOutput}
\`\`\`

</details>`;

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

  console.log(planOutput);

  if (report && context.reports) {
    await context.reports.write(
      TERRAFORM_PLAN_NAMESPACE,
      Buffer.from(modulePath).toString("base64url"),
      {
        modulePath,
        notices,
        planOutput: util.stripVTControlCharacters(planOutput),
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

  if (isRunningInCI()) {
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

  await executeTerraformPlan(modulePath, env, verbose, report, context);
}
