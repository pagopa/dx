/**
 * SaveMoney command telemetry helpers.
 *
 * Keeps telemetry attribute derivation close to the SaveMoney domain so the
 * same mapping can be reused by both the DX CLI adapter and a future standalone
 * SaveMoney CLI entrypoint.
 */

import type {
  AzureConfig,
  AzureDetailedResourceReport,
} from "../azure/types.js";

export type SavemoneyAzqrReportSource = "cli" | "config" | "none";

export type SavemoneyCommandInput = {
  azqrReportPathOption?: string;
  configPathOption?: string;
  format: string;
  resolvedConfig: Pick<
    AzureConfig,
    "azqrReportPath" | "pricing" | "sources" | "subscriptionIds"
  >;
  subscriptionIdsEnv?: string;
};

export type SavemoneySubscriptionsSource = "config" | "env" | "prompt";

export function buildSavemoneyInvocationTelemetryAttributes(
  input: SavemoneyCommandInput,
): Record<string, boolean | number | string> {
  const azqrReportSource = resolveAzqrReportSource(
    input.azqrReportPathOption,
    input.resolvedConfig.azqrReportPath,
  );
  const subscriptionsSource = resolveSubscriptionsSource(
    input.configPathOption,
    input.subscriptionIdsEnv,
  );

  return {
    "savemoney.azqr_report_source": azqrReportSource,
    "savemoney.format": input.format,
    "savemoney.has_config": Boolean(input.configPathOption),
    "savemoney.pricing_enabled":
      input.resolvedConfig.pricing?.enabled !== false,
    "savemoney.sources": input.resolvedConfig.sources.join(","),
    "savemoney.subscriptions_count":
      input.resolvedConfig.subscriptionIds.length,
    "savemoney.subscriptions_source": subscriptionsSource,
  };
}

export function buildSavemoneyOutcomeTelemetryAttributes(
  reports: readonly Pick<AzureDetailedResourceReport, "findings">[],
): Record<string, number> {
  return {
    "savemoney.findings_count": reports.reduce(
      (sum, report) => sum + (report.findings?.length ?? 0),
      0,
    ),
    "savemoney.resources_analyzed": reports.length,
  };
}

function resolveAzqrReportSource(
  azqrReportPathOption: string | undefined,
  azqrReportPathResolved: string | undefined,
): SavemoneyAzqrReportSource {
  if (azqrReportPathOption) return "cli";
  if (azqrReportPathResolved) return "config";
  return "none";
}

function resolveSubscriptionsSource(
  configPathOption: string | undefined,
  subscriptionIdsEnv: string | undefined,
): SavemoneySubscriptionsSource {
  // Mirrors loadAzureConfig() priority: config file > ARM_SUBSCRIPTION_ID > prompt.
  if (configPathOption) return "config";
  if (subscriptionIdsEnv) return "env";
  return "prompt";
}
