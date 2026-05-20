/**
 * Azure resource analyzer - Main orchestration logic
 *
 * Iterates every resource in every configured subscription, dispatches it
 * to the registered analyzers (see `./analyzers/registry.ts`), and feeds
 * the resulting findings into the report generator.
 *
 * Phase 0 refactor:
 *  - Resources are dispatched through a plugin-style `Analyzer` registry
 *    instead of a hard-coded `switch` statement.
 *  - Per-subscription resources are analyzed in parallel via a small
 *    in-process limiter (default concurrency 8, configurable via
 *    `AzureConfig.concurrency`).
 *  - Azure Monitor metric calls are memoized for the duration of a run
 *    (see `getMetric` + `resetMetricsCache` in `./utils.ts`).
 *
 * The output schema (`AzureDetailedResourceReport`) is unchanged so the
 * existing report formats keep working untouched.
 */

import { ContainerAppsAPIClient } from "@azure/arm-appcontainers";
import { WebSiteManagementClient } from "@azure/arm-appservice";
import { ComputeManagementClient } from "@azure/arm-compute";
import { MonitorClient } from "@azure/arm-monitor";
import { NetworkManagementClient } from "@azure/arm-network";
import * as armResources from "@azure/arm-resources";
import { DefaultAzureCredential } from "@azure/identity";
import { getLogger } from "@logtape/logtape";

import type { AzureConfig, AzureDetailedResourceReport } from "./types.js";

import { createLimiter } from "../concurrency.js";
import {
  type AnalysisResult,
  DEFAULT_THRESHOLDS,
  mergeResults,
  type Thresholds,
} from "../types.js";
import {
  type Analyzer,
  type AnalyzerContext,
  type AzureClients,
  createDefaultAnalyzers,
} from "./analyzers/index.js";
import { generateReport } from "./report.js";
import { matchesTags, resetMetricsCache } from "./utils.js";

const DEFAULT_CONCURRENCY = 8;

/**
 * Analyzes resources in multiple Azure subscriptions and generates a report.
 *
 * @param config - Azure configuration with subscription IDs and settings
 * @param format - Output format (table, json, detailed-json, or lint)
 */
export async function analyzeAzureResources(
  config: AzureConfig,
  format: "detailed-json" | "json" | "lint" | "table",
) {
  const logger = getLogger(["savemoney", "azure"]);
  const credential = new DefaultAzureCredential();
  const allReports: AzureDetailedResourceReport[] = [];

  // Metrics cache is scoped to the whole run, deduping concurrent and
  // repeated metric lookups across resources and subscriptions.
  resetMetricsCache();

  const analyzers = createDefaultAnalyzers();
  const thresholds: Thresholds = config.thresholds ?? DEFAULT_THRESHOLDS;
  const limit = createLimiter(config.concurrency ?? DEFAULT_CONCURRENCY);

  for (const subscriptionId of config.subscriptionIds) {
    logger.info(`Analyzing subscription: ${subscriptionId}`);

    const sid = subscriptionId.trim();
    const clients: AzureClients = {
      compute: new ComputeManagementClient(credential, sid),
      containerApps: new ContainerAppsAPIClient(credential, sid),
      monitor: new MonitorClient(credential, sid),
      network: new NetworkManagementClient(credential, sid),
      webSite: new WebSiteManagementClient(credential, sid),
    };
    const resourceClient = new armResources.ResourceManagementClient(
      credential,
      sid,
    );

    const tasks: Promise<void>[] = [];

    // Use the async iterator to avoid memory explosion for large environments
    for await (const resource of resourceClient.resources.list()) {
      // Skip resources that don't match the requested tag filter
      if (!matchesTags(resource, config.filterTags)) {
        continue;
      }

      tasks.push(
        limit(async () => {
          const { costRisk, reason, suspectedUnused } = await analyzeResource(
            resource,
            analyzers,
            clients,
            config.preferredLocation,
            config.timespanDays,
            thresholds,
            config.verbose || false,
          );

          if (suspectedUnused) {
            allReports.push({
              analysis: {
                costRisk,
                reason: reason || "No specific findings.",
                suspectedUnused,
              },
              resource,
            });
          }
        }),
      );
    }

    await Promise.all(tasks);
  }

  // Sort to make the output more readable
  allReports.sort((a, b) => {
    if (a.analysis.costRisk === b.analysis.costRisk)
      return (a.resource.name ?? "").localeCompare(b.resource.name ?? "");
    const order = { high: 0, low: 2, medium: 1 };
    return order[a.analysis.costRisk] - order[b.analysis.costRisk];
  });

  await generateReport(allReports, format);
}

/**
 * Analyzes a single Azure resource by dispatching it to every registered
 * analyzer that supports it. Generic checks (missing tags, location
 * mismatch) are applied around the analyzer-specific logic.
 *
 * @param resource          The Azure resource to analyze
 * @param analyzers         Registered analyzers (typically `createDefaultAnalyzers()`)
 * @param clients           Bundle of Azure SDK clients shared across analyzers
 * @param preferredLocation Preferred Azure region (resources elsewhere are flagged)
 * @param timespanDays      Look-back window for Azure Monitor metrics
 * @param thresholds        Numeric thresholds used during analysis
 * @param verbose           Whether verbose logging is enabled
 * @returns Analysis result with cost risk and reason
 */
export async function analyzeResource(
  resource: armResources.GenericResource,
  analyzers: Analyzer[],
  clients: AzureClients,
  preferredLocation: string,
  timespanDays: number,
  thresholds: Thresholds,
  verbose = false,
): Promise<AnalysisResult> {
  let result: AnalysisResult = {
    costRisk: "low",
    reason: "",
    suspectedUnused: false,
  };

  // Generic check: lack of tags is a common sign of unmanaged resources.
  if (!resource.tags || Object.keys(resource.tags).length === 0) {
    result.suspectedUnused = true;
    result.reason += "No tags found. ";
  }

  const ctx: AnalyzerContext = {
    clients,
    preferredLocation,
    resource,
    thresholds,
    timespanDays,
    verbose,
  };

  let matched = false;
  for (const analyzer of analyzers) {
    if (!analyzer.supports(resource)) {
      continue;
    }
    matched = true;
    const specific = await analyzer.analyze(ctx);
    result = mergeResults(result, specific);
  }

  if (!matched) {
    result.reason += "No specific analysis for this resource type. ";
  }

  // Generic check for location
  if (
    resource.location &&
    !resource.location.toLowerCase().includes(preferredLocation.toLowerCase())
  ) {
    result.reason += `Resource not in preferred location (${preferredLocation}). `;
  }

  return { ...result, reason: result.reason.trim() };
}
