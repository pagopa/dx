/**
 * Plugin architecture for Azure resource analyzers.
 *
 * Each `Analyzer` is a self-contained unit that:
 *  1. declares the resource types it can handle (`supports`)
 *  2. produces an `AnalysisResult` for a given resource (`analyze`)
 *
 * The orchestrator in `analyzer.ts` walks the registered analyzers for
 * every resource it encounters. New sources (Azure Advisor, custom
 * checks, pricing-enriched analyzers, …) can be added by implementing
 * the interface and registering them in `registry.ts` without touching
 * the orchestrator.
 */

import type { ContainerAppsAPIClient } from "@azure/arm-appcontainers";
import type { WebSiteManagementClient } from "@azure/arm-appservice";
import type { ComputeManagementClient } from "@azure/arm-compute";
import type { MonitorClient } from "@azure/arm-monitor";
import type { NetworkManagementClient } from "@azure/arm-network";
import type * as armResources from "@azure/arm-resources";

import type { AnalysisResult, Thresholds } from "../../types.js";

/**
 * Contract every analyzer must satisfy.
 */
export type Analyzer = {
  analyze(ctx: AnalyzerContext): Promise<AnalysisResult>;
  /**
   * Stable identifier of the analyzer (e.g. `azure.vm`, `azure.advisor`).
   * Used for logging, telemetry and future deduplication logic.
   */
  readonly id: string;
  supports(resource: armResources.GenericResource): boolean;
};

/**
 * Per-resource analysis context handed to every analyzer.
 */
export type AnalyzerContext = {
  clients: AzureClients;
  preferredLocation: string;
  resource: armResources.GenericResource;
  thresholds: Thresholds;
  timespanDays: number;
  verbose: boolean;
};

/**
 * Bundle of Azure SDK clients an analyzer might need. The orchestrator
 * builds them once per subscription and passes the same instances to
 * every analyzer.
 */
export type AzureClients = {
  compute: ComputeManagementClient;
  containerApps: ContainerAppsAPIClient;
  monitor: MonitorClient;
  network: NetworkManagementClient;
  webSite: WebSiteManagementClient;
};
