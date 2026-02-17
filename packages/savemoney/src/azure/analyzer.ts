/**
 * Azure resource analyzer - Main orchestration logic
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

import { type AnalysisResult, mergeResults } from "../types.js";
import { generateReport } from "./report.js";
import {
  analyzeAppServicePlan,
  analyzeContainerApp,
  analyzeDisk,
  analyzeNic,
  analyzePrivateEndpoint,
  analyzePublicIp,
  analyzeStaticSite,
  analyzeStorageAccount,
  analyzeVM,
} from "./resources/index.js";

/**
 * Analyzes resources in multiple Azure subscriptions and generates a report.
 *
 * @param config - Azure configuration with subscription IDs and settings
 * @param format - Output format (table, json, or detailed-json)
 */
export async function analyzeAzureResources(
  config: AzureConfig,
  format: "detailed-json" | "json" | "table",
) {
  const logger = getLogger(["savemoney", "azure"]);
  const credential = new DefaultAzureCredential();
  const allReports: AzureDetailedResourceReport[] = [];

  for (const subscriptionId of config.subscriptionIds) {
    logger.info(`Analyzing subscription: ${subscriptionId}`);

    const resourceClient = new armResources.ResourceManagementClient(
      credential,
      subscriptionId.trim(),
    );
    const monitorClient = new MonitorClient(credential, subscriptionId.trim());
    const computeClient = new ComputeManagementClient(
      credential,
      subscriptionId.trim(),
    );
    const networkClient = new NetworkManagementClient(
      credential,
      subscriptionId.trim(),
    );
    const webSiteClient = new WebSiteManagementClient(
      credential,
      subscriptionId.trim(),
    );
    const containerAppsClient = new ContainerAppsAPIClient(
      credential,
      subscriptionId.trim(),
    );

    // Use the async iterator to avoid memory explosion for large environments
    for await (const resource of resourceClient.resources.list()) {
      const { costRisk, reason, suspectedUnused } = await analyzeResource(
        resource,
        monitorClient,
        computeClient,
        networkClient,
        webSiteClient,
        containerAppsClient,
        config.preferredLocation,
        config.timespanDays,
        config.verbose || false,
      );

      if (suspectedUnused) {
        allReports.push({
          analysis: {
            costRisk,
            reason: reason || "No specific findings.",
            suspectedUnused,
          },
          resource: resource,
        });
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
 * Analyzes a single Azure resource based on its type.
 *
 * @param resource - The Azure resource to analyze
 * @param monitorClient - Azure Monitor client for metrics
 * @param computeClient - Azure Compute client
 * @param networkClient - Azure Network client
 * @param webSiteClient - Azure Web Site client
 * @param containerAppsClient - Azure Container Apps client
 * @param preferredLocation - Preferred Azure location
 * @param timespanDays - Number of days to analyze metrics
 * @param verbose - Whether verbose logging is enabled
 * @returns Analysis result with cost risk and reason
 */
export async function analyzeResource(
  resource: armResources.GenericResource,
  monitorClient: MonitorClient,
  computeClient: ComputeManagementClient,
  networkClient: NetworkManagementClient,
  webSiteClient: WebSiteManagementClient,
  containerAppsClient: ContainerAppsAPIClient,
  preferredLocation: string,
  timespanDays: number,
  verbose = false,
): Promise<AnalysisResult> {
  const type = resource.type?.toLowerCase() || "";
  let result = {
    costRisk: "low" as "high" | "low" | "medium",
    reason: "",
    suspectedUnused: false,
  };

  // Generic check: lack of tags is a common sign of unmanaged resources.
  if (!resource.tags || Object.keys(resource.tags).length === 0) {
    result.suspectedUnused = true;
    result.reason += "No tags found. ";
  }

  // Route to type-specific analysis hooks
  switch (type) {
    case "microsoft.app/containerapps": {
      const containerAppResult = await analyzeContainerApp(
        resource,
        containerAppsClient,
        monitorClient,
        timespanDays,
        verbose,
      );
      result = mergeResults(result, containerAppResult);
      break;
    }
    case "microsoft.compute/disks": {
      const diskResult = await analyzeDisk(resource, computeClient, verbose);
      result = mergeResults(result, diskResult);
      break;
    }
    case "microsoft.compute/virtualmachines": {
      const vmResult = await analyzeVM(
        resource,
        monitorClient,
        computeClient,
        timespanDays,
        verbose,
      );
      result = mergeResults(result, vmResult);
      break;
    }
    case "microsoft.network/networkinterfaces": {
      const nicResult = await analyzeNic(resource, networkClient, verbose);
      result = mergeResults(result, nicResult);
      break;
    }
    case "microsoft.network/privateendpoints": {
      const peResult = await analyzePrivateEndpoint(
        resource,
        networkClient,
        verbose,
      );
      result = mergeResults(result, peResult);
      break;
    }
    case "microsoft.network/publicipaddresses": {
      const pipResult = await analyzePublicIp(
        resource,
        networkClient,
        monitorClient,
        timespanDays,
        verbose,
      );
      result = mergeResults(result, pipResult);
      break;
    }
    case "microsoft.storage/storageaccounts": {
      const storageResult = await analyzeStorageAccount(
        resource,
        monitorClient,
        timespanDays,
        verbose,
      );
      result = mergeResults(result, storageResult);
      break;
    }
    case "microsoft.web/serverfarms": {
      const aspResult = await analyzeAppServicePlan(
        resource,
        webSiteClient,
        monitorClient,
        timespanDays,
        verbose,
      );
      result = mergeResults(result, aspResult);
      break;
    }
    case "microsoft.web/staticsites": {
      const staticSiteResult = await analyzeStaticSite(
        resource,
        monitorClient,
        timespanDays,
        verbose,
      );
      result = mergeResults(result, staticSiteResult);
      break;
    }
    default:
      result.reason += "No specific analysis for this resource type. ";
      break;
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
