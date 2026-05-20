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
 *  - Azure Monitor metric calls are memoized for the duration of a run via
 *    a per-run `MetricsCache` passed through `AnalyzerContext`, so concurrent
 *    calls to `analyzeAzureResources` stay fully isolated.
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
import { matchesTags, type MetricsCache } from "./utils.js";

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

  // Fresh cache per run — keeps concurrent analyzeAzureResources calls isolated.
  const runCache: MetricsCache = new Map();

  const analyzers = createDefaultAnalyzers();
  const thresholds: Thresholds = config.thresholds ?? DEFAULT_THRESHOLDS;

  // Normalise concurrency the same way createLimiter does to keep maxInFlight
  // consistent. A raw value of 0/NaN would produce maxInFlight = 0/NaN and
  // either deadlock or silently disable backpressure.
  const rawConcurrency = config.concurrency ?? DEFAULT_CONCURRENCY;
  const concurrency = Number.isFinite(rawConcurrency)
    ? Math.max(1, Math.floor(rawConcurrency))
    : 1;
  const limit = createLimiter(concurrency);

  // Bound the in-flight Set to `2 × concurrency` so memory stays proportional
  // to the limiter width, not the total resource count in a subscription.
  const maxInFlight = concurrency * 2;

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

    const inFlight = new Set<Promise<void>>();

    // Use the async iterator to avoid loading all resources into memory at once.
    for await (const resource of resourceClient.resources.list()) {
      if (!matchesTags(resource, config.filterTags)) {
        continue;
      }

      // Backpressure: wait for a slot before enqueuing the next task so that
      // the inFlight Set stays bounded by maxInFlight instead of growing to the
      // total resource count in the subscription.
      while (inFlight.size >= maxInFlight) {
        await Promise.race(inFlight).catch(() => undefined);
      }

      const task: Promise<void> = limit(async () => {
        const { costRisk, reason, suspectedUnused } = await analyzeResource(
          resource,
          analyzers,
          clients,
          runCache,
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
      });

      inFlight.add(task);
      void task.finally(() => inFlight.delete(task));
    }

    // Drain remaining tasks; surface any unexpected errors so they don't
    // disappear silently and produce an incomplete report without a signal.
    const results = await Promise.allSettled(inFlight);
    for (const result of results) {
      if (result.status === "rejected") {
        logger.error(`Resource analysis failed: ${String(result.reason)}`);
      }
    }
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
 * @param metricsCache      Run-scoped metrics cache to pass through to analyzers
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
  metricsCache: MetricsCache = new Map(),
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
    metricsCache,
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
