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

import type { TokenCredential } from "@azure/identity";

import { ContainerAppsAPIClient } from "@azure/arm-appcontainers";
import { WebSiteManagementClient } from "@azure/arm-appservice";
import { ComputeManagementClient } from "@azure/arm-compute";
import { MonitorClient } from "@azure/arm-monitor";
import { NetworkManagementClient } from "@azure/arm-network";
import * as armResources from "@azure/arm-resources";
import { DefaultAzureCredential } from "@azure/identity";
import { getLogger } from "@logtape/logtape";
import pLimit from "p-limit";

import type { Finding, FindingSource } from "../finding.js";
import type { AzureConfig, AzureDetailedResourceReport } from "./types.js";

import { findingsFromAnalysisResult } from "../finding.js";
import {
  type AnalysisResult,
  type CostRisk,
  DEFAULT_THRESHOLDS,
  mergeResults,
  type Thresholds,
} from "../types.js";
import {
  type Analyzer,
  type AnalyzerContext,
  type AzureClients,
  createDefaultAnalyzers,
  createDefaultSubscriptionAnalyzers,
  type SubscriptionAnalyzer,
} from "./analyzers/index.js";
import { matchesTags, type MetricsCache } from "./utils.js";

const DEFAULT_CONCURRENCY = 8;
const DEFAULT_SOURCES: FindingSource[] = ["advisor", "custom"];

const RISK_ORDER: Record<CostRisk, number> = { high: 0, low: 2, medium: 1 };

/**
 * Analyzes resources in every configured Azure subscription and returns
 * the structured report.
 *
 * Phase 1 change: this function no longer emits a report to stdout. The
 * orchestrator returns `AzureDetailedResourceReport[]` and the caller
 * (the CLI today, future GUI / API consumers tomorrow) chooses how to
 * render it via `generateReport`.
 *
 * Each entry carries both the legacy `analysis` summary and the unified
 * `findings: Finding[]` so consumers can pick the level of detail they
 * need. Azure Advisor recommendations and per-resource analyzer outputs
 * are merged into the same entry when they refer to the same resource.
 *
 * @param config - Azure configuration with subscription IDs and settings.
 *                 `config.sources` controls which analyzers run.
 */
export async function analyzeAzureResources(
  config: AzureConfig,
): Promise<AzureDetailedResourceReport[]> {
  const logger = getLogger(["savemoney", "azure"]);
  const credential = new DefaultAzureCredential();
  const allReports: AzureDetailedResourceReport[] = [];

  const sources = config.sources ?? DEFAULT_SOURCES;
  const customEnabled = sources.includes("custom");
  const advisorEnabled = sources.includes("advisor");

  const analyzers = createDefaultAnalyzers();
  const subscriptionAnalyzers = advisorEnabled
    ? createDefaultSubscriptionAnalyzers()
    : [];
  const thresholds: Thresholds = config.thresholds ?? DEFAULT_THRESHOLDS;

  // Normalise concurrency the same way p-limit does to keep maxInFlight
  // consistent. A raw value of 0/NaN would produce maxInFlight = 0/NaN and
  // either deadlock or silently disable backpressure.
  const rawConcurrency = config.concurrency ?? DEFAULT_CONCURRENCY;
  const concurrency = Number.isFinite(rawConcurrency)
    ? Math.max(1, Math.floor(rawConcurrency))
    : 1;
  const limit = pLimit(concurrency);

  // Bound the in-flight Set to `2 × concurrency` so memory stays proportional
  // to the limiter width, not the total resource count in a subscription.
  const maxInFlight = concurrency * 2;

  for (const subscriptionId of config.subscriptionIds) {
    logger.info(`Analyzing subscription: ${subscriptionId}`);

    const sid = subscriptionId.trim();

    // Per-subscription index keyed by lowercased resourceId so subscription-
    // level analyzers (Advisor, future quotas, …) can merge their findings
    // back into the matching resource report.
    const reportsById = new Map<string, AzureDetailedResourceReport>();

    // Fresh cache per subscription — bounds peak memory to one subscription's
    // worth of metrics and keeps concurrent analyzeAzureResources calls isolated.
    const runCache: MetricsCache = new Map();

    const clients: AzureClients = {
      compute: new ComputeManagementClient(credential, sid),
      containerApps: new ContainerAppsAPIClient(credential, sid),
      monitor: new MonitorClient(credential, sid),
      network: new NetworkManagementClient(credential, sid),
      webSite: new WebSiteManagementClient(credential, sid),
    };

    if (customEnabled) {
      await runPerResourceAnalysis({
        analyzers,
        clients,
        config,
        credential,
        limit,
        logger,
        maxInFlight,
        reports: allReports,
        reportsById,
        runCache,
        sid,
        thresholds,
      });
    }

    if (advisorEnabled && subscriptionAnalyzers.length > 0) {
      await runSubscriptionAnalyzers({
        analyzers: subscriptionAnalyzers,
        credential,
        logger,
        reports: allReports,
        reportsById,
        sid,
        verbose: config.verbose ?? false,
      });
    }
  }

  // Sort to make the output more readable:
  //  - Subscription-scoped findings (Reserved Instances, savings plans, ...)
  //    sink to the bottom: they aggregate many recommendations into a single
  //    fat row and are easier to consume after the per-resource rows.
  //  - Within each group, sort by cost risk then by resource name.
  allReports.sort((a, b) => {
    const aSub = isSubscriptionScopedReport(a);
    const bSub = isSubscriptionScopedReport(b);
    if (aSub !== bSub) return aSub ? 1 : -1;
    if (a.analysis.costRisk === b.analysis.costRisk)
      return (a.resource.name ?? "").localeCompare(b.resource.name ?? "");
    return RISK_ORDER[a.analysis.costRisk] - RISK_ORDER[b.analysis.costRisk];
  });

  return allReports;
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

/**
 * Derives a legacy `AnalysisResult` summary from a `Finding`, so the
 * existing report formats keep working untouched on Advisor-only
 * resources.
 */
function analysisFromFinding(finding: Finding): AnalysisResult {
  const trimmed = finding.reason.trim();
  const reason = trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
  return {
    costRisk: finding.severity,
    reason,
    suspectedUnused: true,
  };
}

/**
 * Builds a minimal `GenericResource` from a resource ID. Used when a
 * subscription-level analyzer surfaces a resource the per-resource pass
 * did not see — we have neither tags nor location, but `name` and `type`
 * can be parsed deterministically from the resource ID structure.
 *
 * Handles three shapes:
 *  - Fully qualified: /subscriptions/{sub}/resourceGroups/{rg}/providers/{provider}/{type}/{name}
 *  - Resource-group-scoped: /subscriptions/{sub}/resourceGroups/{rg}
 *  - Subscription-scoped: /subscriptions/{sub}
 */
function buildResourceStub(resourceId: string): armResources.GenericResource {
  const parts = resourceId.split("/").filter((s) => s.length > 0);
  const providersIdx = parts.indexOf("providers");

  if (providersIdx >= 0 && parts.length > providersIdx + 2) {
    // Fully qualified resource ID.
    const provider = parts[providersIdx + 1];
    const tail = parts.slice(providersIdx + 2); // [type, name, subtype, subname, ...]
    const typeSegments: string[] = [provider];
    for (let i = 0; i < tail.length; i += 2) {
      typeSegments.push(tail[i]);
    }
    return {
      id: resourceId,
      name: tail[tail.length - 1],
      type: typeSegments.join("/"),
    };
  }

  const rgIdx = parts.indexOf("resourceGroups");
  if (rgIdx >= 0 && parts.length > rgIdx + 1) {
    // Resource-group-scoped ID.
    return {
      id: resourceId,
      name: parts[rgIdx + 1],
      type: "Microsoft.Resources/resourceGroups",
    };
  }

  const subIdx = parts.indexOf("subscriptions");
  if (subIdx >= 0 && parts.length > subIdx + 1) {
    // Subscription-scoped ID (e.g. Reserved Instance recommendations).
    return {
      id: resourceId,
      name: parts[subIdx + 1],
      type: "Microsoft.Subscription",
    };
  }

  // Fallback for completely unknown shapes.
  return { id: resourceId, name: parts[parts.length - 1], type: undefined };
}

function isSubscriptionScopedReport(r: AzureDetailedResourceReport): boolean {
  return r.resource.type === "Microsoft.Subscription";
}

/**
 * Inserts a `Finding` into the right report entry, creating a stub
 * resource entry on the fly when the finding refers to a resource that
 * the per-resource pass did not analyze.
 */
function mergeFinding(
  finding: Finding,
  reports: AzureDetailedResourceReport[],
  reportsById: Map<string, AzureDetailedResourceReport>,
): void {
  const idKey = finding.resourceId.toLowerCase();
  const existing = reportsById.get(idKey);
  if (existing) {
    existing.findings = [...(existing.findings ?? []), finding];
    existing.analysis = mergeResults(
      existing.analysis,
      analysisFromFinding(finding),
    );
    return;
  }

  const stub = buildResourceStub(finding.resourceId);
  const report: AzureDetailedResourceReport = {
    analysis: analysisFromFinding(finding),
    findings: [finding],
    resource: stub,
  };
  reports.push(report);
  reportsById.set(idKey, report);
}

/**
 * Runs the per-resource analyzer plugins against every resource in the
 * given subscription. Extracted from `analyzeAzureResources` to keep that
 * function readable now that subscription-level analyzers were added.
 */
async function runPerResourceAnalysis(args: {
  analyzers: Analyzer[];
  clients: AzureClients;
  config: AzureConfig;
  credential: TokenCredential;
  limit: ReturnType<typeof pLimit>;
  logger: ReturnType<typeof getLogger>;
  maxInFlight: number;
  reports: AzureDetailedResourceReport[];
  reportsById: Map<string, AzureDetailedResourceReport>;
  runCache: MetricsCache;
  sid: string;
  thresholds: Thresholds;
}): Promise<void> {
  const {
    analyzers,
    clients,
    config,
    credential,
    limit,
    logger,
    maxInFlight,
    reports,
    reportsById,
    runCache,
    sid,
    thresholds,
  } = args;
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
      const analysis = await analyzeResource(
        resource,
        analyzers,
        clients,
        runCache,
        config.preferredLocation,
        config.timespanDays,
        thresholds,
        config.verbose || false,
      );

      if (analysis.suspectedUnused) {
        const reason = analysis.reason || "No specific findings.";
        const report: AzureDetailedResourceReport = {
          analysis: { ...analysis, reason },
          findings: findingsFromAnalysisResult({
            reason,
            resourceId: resource.id ?? "",
            severity: analysis.costRisk,
            source: "custom",
          }),
          resource,
        };
        reports.push(report);
        const idKey = (resource.id ?? "").toLowerCase();
        if (idKey) reportsById.set(idKey, report);
      }
    });

    inFlight.add(task);
    // Suppress the unhandled-rejection that would occur between task creation
    // and the Promise.allSettled drain below. The .catch() handler is a no-op
    // because the actual error is still visible to allSettled (which logs it)
    // via the original `task` reference kept in inFlight.
    void task.catch(() => undefined).finally(() => inFlight.delete(task));
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

/**
 * Runs every subscription-level analyzer in parallel and merges their
 * findings into the per-resource reports. Findings about resources that
 * the per-resource pass did not surface (typical for Advisor, which
 * reaches SQL DBs, Front Doors, etc.) produce new report entries with a
 * minimal `GenericResource` stub derived from the resource ID.
 */
async function runSubscriptionAnalyzers(args: {
  analyzers: SubscriptionAnalyzer[];
  credential: TokenCredential;
  logger: ReturnType<typeof getLogger>;
  reports: AzureDetailedResourceReport[];
  reportsById: Map<string, AzureDetailedResourceReport>;
  sid: string;
  verbose: boolean;
}): Promise<void> {
  const { analyzers, credential, logger, reports, reportsById, sid, verbose } =
    args;

  const allFindings = await Promise.all(
    analyzers.map((a) =>
      a
        .analyze({ credential, subscriptionId: sid, verbose })
        .catch((err: unknown) => {
          logger.error(`Subscription analyzer ${a.id} failed: ${String(err)}`);
          return [] as Finding[];
        }),
    ),
  );

  for (const findings of allFindings) {
    for (const finding of findings) {
      mergeFinding(finding, reports, reportsById);
    }
  }
}
