/** This module downloads and applies a previously generated Terraform plan bundle. */

import util from "node:util";
import * as z from "zod/mini";

import type { TaskRunContext } from "../dispatcher.ts";
import type { ReportNamespace, ReportRenderContext } from "../report-store.ts";
import type { ProcessResult } from "../run-command.ts";

import { runCommand } from "../run-command.ts";
import { maskOutput } from "./mask-output.ts";
import { PLAN_FILE_NAME } from "./plan-file.ts";
import {
  computePlanPath,
  deleteRemotePlanBundle,
  downloadPlanBundle,
  readBackendConfig,
} from "./plan-storage.ts";

export const TERRAFORM_APPLY_NAMESPACE = "terraform-apply";

const terraformApplyPayloadShape = {
  modulePath: z.string().check(z.minLength(1)),
  report: z._default(z.boolean(), false),
  sensitiveKeys: z._default(z.array(z.string().check(z.minLength(1))), []),
  verbose: z._default(z.boolean(), false),
};

export const payloadSchema = z.object(terraformApplyPayloadShape);

export interface TerraformApplyPayload {
  modulePath: string;
  report?: boolean;
  sensitiveKeys?: readonly string[];
  verbose?: boolean;
}

const terraformApplyReportShape = {
  applyOutput: z.string(),
  modulePath: z.string().check(z.minLength(1)),
  notices: z.array(
    z.object({
      message: z.string().check(z.minLength(1)),
      severity: z.union([z.literal("warning"), z.literal("error")]),
    }),
  ),
  success: z._default(z.boolean(), true),
  summaryLine: z.optional(z.string().check(z.minLength(1))),
};

export const terraformApplyReportSchema = z.object(terraformApplyReportShape);

export interface TerraformApplyNotice {
  message: string;
  severity: "error" | "warning";
}

export interface TerraformApplyReport {
  applyOutput: string;
  modulePath: string;
  notices: readonly TerraformApplyNotice[];
  success: boolean;
  summaryLine?: string;
}

const noApplyOutputMessage = "No apply output available.";
const terraformApplyReportSeparator = "\n\n";

const renderNoticeMarkdown = ({
  message,
  severity,
}: TerraformApplyNotice): string => {
  const label = severity === "warning" ? "WARNING" : "CAUTION";
  const quotedMessage = message
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

  return `> [!${label}]\n${quotedMessage}`;
};

const renderTerraformApplyReport = (
  {
    applyOutput,
    modulePath,
    notices,
    success,
    summaryLine,
  }: TerraformApplyReport,
  { sourceUrl }: { sourceUrl?: string },
): string => {
  void applyOutput;
  const status = success ? "✅ Success" : "❌ Failed";
  const heading = `### Terraform Apply: \`${modulePath}\` - ${status}`;
  const renderedNotices = notices.map(renderNoticeMarkdown);
  const reference = sourceUrl
    ? `See the [workflow run](${sourceUrl}) logs for the complete output.`
    : "See the workflow run logs for the complete output.";
  const details = `> [!NOTE]\n> Full apply output is not included in this comment.\n> ${reference}`;

  if (renderedNotices.length > 0) {
    const noticeSection = renderedNotices.join("\n\n");
    const summarySection = summaryLine ? `\n\n${summaryLine}` : "";

    return `${heading}\n${noticeSection}${summarySection}\n\n${details}`;
  }

  const summarySection = summaryLine ? `\n${summaryLine}` : "";

  return `${heading}${summarySection}\n\n${details}`;
};

const renderTerraformApplyReports = (
  reports: readonly TerraformApplyReport[],
  { sourceUrl }: ReportRenderContext = {},
): string =>
  reports
    .map((report) => renderTerraformApplyReport(report, { sourceUrl }))
    .join(terraformApplyReportSeparator)
    .trim();

export const terraformApplyReportNamespace: ReportNamespace<
  typeof terraformApplyReportSchema
> = {
  name: TERRAFORM_APPLY_NAMESPACE,
  renderers: {
    markdown: renderTerraformApplyReports,
  },
  schema: terraformApplyReportSchema,
};

const isRunningInCI = (): boolean => {
  const ci = process.env.CI;

  return Boolean(ci) && ci !== "false" && ci !== "0";
};

const getMaskedOutputOrFallback = (maskedOutput: string): string =>
  maskedOutput.trim().length > 0 ? maskedOutput : noApplyOutputMessage;

const getApplyOutput = (maskedOutput: string, verbose: boolean): string => {
  if (verbose) {
    return getMaskedOutputOrFallback(maskedOutput);
  }

  const match = maskedOutput.match(
    /(?:^.*Error:[\s\S]*|^.*Apply complete!.*)/m,
  );

  return match?.[0] ?? getMaskedOutputOrFallback(maskedOutput);
};

const getApplySummaryLine = (maskedOutput: string): string | undefined =>
  util
    .stripVTControlCharacters(maskedOutput)
    .match(/^Apply complete!.*$/m)?.[0];

const noticeStartPattern = /^(?:│\s*)?(Warning|Error):/;

const getNoticeSeverity = (
  line: string,
): TerraformApplyNotice["severity"] | undefined => {
  const [, severity] = noticeStartPattern.exec(line) ?? [];

  if (severity === "Warning") {
    return "warning";
  }
  if (severity === "Error") {
    return "error";
  }

  return undefined;
};

const isApplySectionStart = (line: string): boolean =>
  /^(?:Apply complete!|[\w."[\]-]+: (?:Creating|Modifying|Destroying|Refreshing state|Creation complete|Modifications complete|Destruction complete)\b)/.test(
    line,
  );

const normalizeNoticeLine = (line: string): string => line.replace(/^│ ?/, "");

const getApplyNotices = (
  maskedOutput: string,
): readonly TerraformApplyNotice[] => {
  const lines = util.stripVTControlCharacters(maskedOutput).split(/\r?\n/);
  const notices: TerraformApplyNotice[] = [];

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

      if (!isFirstLine && (line === "╵" || isApplySectionStart(line))) {
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

const getFailureMessage = (result: ProcessResult): string => {
  if (result.signal) {
    return `Terraform apply terminated by signal ${result.signal}`;
  }
  if (result.exitCode !== 0) {
    return `Terraform apply exited with code ${result.exitCode}`;
  }
  return noApplyOutputMessage;
};

const getRunId = (): string => {
  const runId = process.env.GITHUB_RUN_ID;

  if (!runId) {
    throw new Error(
      "GITHUB_RUN_ID environment variable is required to locate the Terraform plan bundle to apply",
    );
  }

  return runId;
};

const executeTerraformApply = async (
  modulePath: string,
  verbose: boolean,
  report: boolean,
  sensitiveKeys: readonly string[],
  context: TaskRunContext,
) => {
  const env: Record<string, string> = {};

  if (!verbose) {
    env.TF_IN_AUTOMATION = "true";
  }

  if (isRunningInCI()) {
    env.TF_IN_AUTOMATION = "true";
  }

  const result = await runCommand(
    "terraform",
    [
      "apply",
      "-lock-timeout=120s",
      "-input=false",
      "-no-color",
      "-auto-approve",
      PLAN_FILE_NAME,
    ],
    modulePath,
    env,
  );

  if (result.signal) {
    throw new Error(getFailureMessage(result));
  }

  const maskedOutput = maskOutput(
    [result.stdout, result.stderr]
      .filter((output) => output.trim().length > 0)
      .join("\n"),
    [...sensitiveKeys],
  );

  const applyOutput = getApplyOutput(maskedOutput, verbose);
  const notices = getApplyNotices(maskedOutput);
  const summaryLine = getApplySummaryLine(maskedOutput);

  console.log(applyOutput);

  if (report && context.reports) {
    await context.reports.write(
      TERRAFORM_APPLY_NAMESPACE,
      Buffer.from(modulePath).toString("base64url"),
      {
        applyOutput: util.stripVTControlCharacters(applyOutput),
        modulePath,
        notices,
        success: result.exitCode === 0,
        ...(summaryLine ? { summaryLine } : {}),
      },
    );
  }

  if (result.exitCode !== 0) {
    throw new Error(getFailureMessage(result));
  }
};

export async function terraformApply(
  {
    modulePath,
    report = false,
    sensitiveKeys = [],
    verbose = false,
  }: TerraformApplyPayload,
  context: TaskRunContext = {},
) {
  const runId = getRunId();
  const { key, ...backend } = await readBackendConfig(modulePath);
  const planPath = computePlanPath(key, runId);

  await downloadPlanBundle({
    backend,
    planPath,
    workingDirectory: modulePath,
  });

  // executeTerraformApply throws on failure, so the remote bundle is only
  // deleted after a successful apply. On failure it is deliberately left in
  // place: since the storage path is deterministic (derived from the backend
  // state key and GITHUB_RUN_ID), a re-run of the same workflow run's apply
  // job can retry against the exact reviewed plan, and the bundle remains
  // available for forensic inspection of what was attempted. Cleaning up
  // bundles from abandoned/failed runs across different workflow runs is not
  // automatic and is left to the storage backend's own retention policy.
  await executeTerraformApply(
    modulePath,
    verbose,
    report,
    sensitiveKeys,
    context,
  );
  try {
    await deleteRemotePlanBundle({ backend, planPath });
  } catch (error) {
    console.warn(
      `Failed to delete remote Terraform plan bundle at "${planPath}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
