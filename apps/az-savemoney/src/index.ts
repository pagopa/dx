#!/usr/bin/env node

/**
 * Azure Resource Analyzer CLI
 *
 * A read-only CLI tool that analyzes Azure resources and reports
 * potentially unused or cost-inefficient ones.
 *
 * Features:
 * - Multi-subscription support
 * - Metric-based analysis using Azure Monitor
 * - Multiple output formats (table, JSON, YAML, detailed-JSON)
 * - Configurable via CLI options, environment variables, or config file
 *
 * This tool does NOT modify, tag, or delete any resources.
 */

import { WebSiteManagementClient } from "@azure/arm-appservice";
import { ComputeManagementClient } from "@azure/arm-compute";
import { MonitorClient } from "@azure/arm-monitor";
import { NetworkManagementClient } from "@azure/arm-network";
import * as armResources from "@azure/arm-resources";
import { DefaultAzureCredential } from "@azure/identity";
import { Command } from "commander";
import * as fs from "fs";
import * as yaml from "js-yaml";
import * as readline from "readline";
import { table } from "table";

const program = new Command();

// Global debug flag
let DEBUG_MODE = false;

interface Config {
  preferredLocation: string;
  subscriptionIds: string[];
  tenantId: string;
  timespanDays: number;
}

interface DetailedResourceReport {
  analysis: {
    costRisk: "high" | "low" | "medium";
    reason: string;
    suspectedUnused: boolean;
  };
  resource: armResources.GenericResource; // The original resource object from Azure
}

interface ResourceReport {
  costRisk: "high" | "low" | "medium";
  location?: string;
  name: string;
  reason: string;
  resourceGroup?: string;
  subscriptionId: string;
  suspectedUnused: boolean;
  type: string;
}

/**
 * Analyzes App Service Plans for unused capacity and oversized tiers.
 *
 * @param resource - The Azure resource to analyze
 * @param webSiteClient - Azure App Service management client
 * @param monitorClient - Azure Monitor client for metrics
 * @param timespanDays - Number of days to look back for metrics
 * @returns Analysis result with cost risk, reason, and usage status
 */
async function analyzeAppServicePlan(
  resource: armResources.GenericResource,
  webSiteClient: WebSiteManagementClient,
  monitorClient: MonitorClient,
  timespanDays: number,
) {
  debugLogResourceStart(
    resource.name || "unknown",
    "App Service Plan (microsoft.web/serverfarms)",
  );
  debugLog("Resource details:", resource);

  const costRisk: "high" | "low" | "medium" = "high";
  let reason = "";

  if (!resource.id) {
    return {
      costRisk,
      reason: "Resource ID is missing.",
      suspectedUnused: false,
    };
  }

  // Extract resource group and App Service Plan name from resource ID
  const resourceParts = resource.id.split("/");
  const resourceGroupName = resourceParts[4];
  const planName = resourceParts[8];

  try {
    // Get detailed App Service Plan information
    const planDetails = await webSiteClient.appServicePlans.get(
      resourceGroupName,
      planName,
    );

    debugLog("App Service Plan API details:", planDetails);

    // Check if the plan has no apps
    if (!planDetails.numberOfSites || planDetails.numberOfSites === 0) {
      reason += "App Service Plan has no apps deployed. ";
    }

    // Check CPU and Memory metrics
    const cpuPercentage = await getMetric(
      monitorClient,
      resource.id,
      "CpuPercentage",
      "Average",
      timespanDays,
    );

    const memoryPercentage = await getMetric(
      monitorClient,
      resource.id,
      "MemoryPercentage",
      "Average",
      timespanDays,
    );

    if (cpuPercentage !== null && cpuPercentage < 5) {
      reason += `Very low CPU usage (${cpuPercentage.toFixed(2)}%). `;
    }

    if (memoryPercentage !== null && memoryPercentage < 10) {
      reason += `Very low memory usage (${memoryPercentage.toFixed(2)}%). `;
    }

    // Check if it's an oversized plan (Premium tier with low usage)
    if (
      planDetails.sku?.tier?.includes("Premium") &&
      cpuPercentage &&
      cpuPercentage < 10
    ) {
      reason += "Premium tier with low resource utilization. ";
    }
  } catch (error) {
    console.warn(
      `Failed to get App Service Plan details for ${planName}: ${error instanceof Error ? error.message : error}`,
    );
    reason += "Could not retrieve detailed App Service Plan information. ";
  }

  const suspectedUnused = reason.length > 0;
  const result = { costRisk, reason: reason.trim(), suspectedUnused };
  debugLogAnalysisResult(result);
  return result;
}

/**
 * Analyzes managed disks to detect unattached volumes.
 *
 * @param resource - The Azure disk resource to analyze
 * @param computeClient - Azure Compute management client
 * @returns Analysis result with cost risk, reason, and usage status
 */
async function analyzeDisk(
  resource: armResources.GenericResource,
  computeClient: ComputeManagementClient,
) {
  debugLogResourceStart(
    resource.name || "unknown",
    "Managed Disk (microsoft.compute/disks)",
  );
  debugLog("Resource details:", resource);

  const costRisk: "high" | "low" | "medium" = "medium";

  if (!resource.id) {
    return {
      costRisk,
      reason: "Resource ID is missing.",
      suspectedUnused: false,
    };
  }

  // Extract resource group and disk name from resource ID
  const resourceParts = resource.id.split("/");
  const resourceGroupName = resourceParts[4];
  const diskName = resourceParts[8];

  try {
    // Get the actual disk details to check attachment state
    const diskDetails = await computeClient.disks.get(
      resourceGroupName,
      diskName,
    );

    debugLog("Disk API details:", diskDetails);

    // Check if disk is unattached
    if (
      diskDetails.diskState?.toLowerCase() === "unattached" ||
      !diskDetails.managedBy
    ) {
      const result = {
        costRisk,
        reason: "Disk is unattached. ",
        suspectedUnused: true,
      };
      debugLogAnalysisResult(result);
      return result;
    }
  } catch (error) {
    console.warn(
      `Failed to get disk details for ${diskName}: ${error instanceof Error ? error.message : error}`,
    );
    // Fallback to checking properties if API call fails
    // Note: GenericResource doesn't have diskState property
    // Without API access, we can't determine if disk is unattached
  }

  const result = { costRisk, reason: "", suspectedUnused: false };
  debugLogAnalysisResult(result);
  return result;
}

/**
 * Analyzes Network Interfaces to find unattached NICs.
 *
 * @param resource - The Azure network interface resource to analyze
 * @param networkClient - Azure Network management client
 * @returns Analysis result with cost risk, reason, and usage status
 */
async function analyzeNic(
  resource: armResources.GenericResource,
  networkClient: NetworkManagementClient,
) {
  debugLogResourceStart(
    resource.name || "unknown",
    "Network Interface (microsoft.network/networkinterfaces)",
  );
  debugLog("Resource details:", resource);

  const costRisk: "high" | "low" | "medium" = "medium";
  let reason = "";

  if (!resource.id) {
    return {
      costRisk,
      reason: "Resource ID is missing.",
      suspectedUnused: false,
    };
  }

  // Extract resource group and NIC name from resource ID
  const resourceParts = resource.id.split("/");
  const resourceGroupName = resourceParts[4];
  const nicName = resourceParts[8];

  try {
    // Get detailed NIC information
    const nicDetails = await networkClient.networkInterfaces.get(
      resourceGroupName,
      nicName,
    );

    debugLog("NIC API details:", nicDetails);

    // Check if NIC is not attached to any VM or private endpoint
    if (!nicDetails.virtualMachine && !nicDetails.privateEndpoint) {
      reason += "NIC not attached to any VM or private endpoint. ";
    }

    // Check if NIC has no public IP
    const hasPublicIP = nicDetails.ipConfigurations?.some(
      (config) => config.publicIPAddress,
    );
    if (!hasPublicIP) {
      reason += "No public IP assigned. ";
    }

    // Note: Network Interface metrics are not available for Private Endpoint NICs
    // and most Azure NICs don't expose standard traffic metrics through Azure Monitor
    // The primary checks (attachment to VM and public IP assignment) are sufficient
  } catch (error) {
    console.warn(
      `Failed to get NIC details for ${nicName}: ${error instanceof Error ? error.message : error}`,
    );
    reason += "Could not retrieve detailed NIC information. ";
  }

  const suspectedUnused = reason.length > 0;
  const result = { costRisk, reason: reason.trim(), suspectedUnused };
  debugLogAnalysisResult(result);
  return result;
}

/**
 * Analyzes Private Endpoints to identify unused or misconfigured endpoints.
 *
 * @param resource - The Azure private endpoint resource to analyze
 * @param networkClient - Azure Network management client
 * @returns Analysis result with cost risk, reason, and usage status
 */
async function analyzePrivateEndpoint(
  resource: armResources.GenericResource,
  networkClient: NetworkManagementClient,
) {
  debugLogResourceStart(
    resource.name || "unknown",
    "Private Endpoint (microsoft.network/privateendpoints)",
  );
  debugLog("Resource details:", resource);

  const costRisk: "high" | "low" | "medium" = "medium";
  let reason = "";

  if (!resource.id) {
    return {
      costRisk,
      reason: "Resource ID is missing.",
      suspectedUnused: false,
    };
  }

  // Extract resource group and private endpoint name from resource ID
  const resourceParts = resource.id.split("/");
  const resourceGroupName = resourceParts[4];
  const privateEndpointName = resourceParts[8];

  try {
    // Get detailed Private Endpoint information
    const privateEndpointDetails = await networkClient.privateEndpoints.get(
      resourceGroupName,
      privateEndpointName,
    );

    debugLog("Private Endpoint API details:", privateEndpointDetails);

    // Check if Private Endpoint has no private link service connection
    if (
      !privateEndpointDetails.privateLinkServiceConnections ||
      privateEndpointDetails.privateLinkServiceConnections.length === 0
    ) {
      reason +=
        "Private Endpoint has no private link service connections configured. ";
    }

    // Check connection state
    const hasFailedConnection =
      privateEndpointDetails.privateLinkServiceConnections?.some(
        (connection) =>
          connection.privateLinkServiceConnectionState?.status === "Rejected" ||
          connection.privateLinkServiceConnectionState?.status ===
            "Disconnected",
      );

    if (hasFailedConnection) {
      reason += "Private Endpoint has rejected or disconnected connections. ";
    }

    // Check if Private Endpoint has network interfaces
    if (
      !privateEndpointDetails.networkInterfaces ||
      privateEndpointDetails.networkInterfaces.length === 0
    ) {
      reason += "Private Endpoint has no network interfaces attached. ";
    }

    // Check subnet configuration
    if (!privateEndpointDetails.subnet) {
      reason += "Private Endpoint is not associated with a subnet. ";
    }
  } catch (error) {
    console.warn(
      `Failed to get Private Endpoint details for ${privateEndpointName}: ${error instanceof Error ? error.message : error}`,
    );
    reason += "Could not retrieve detailed Private Endpoint information. ";
  }

  const suspectedUnused = reason.length > 0;
  const result = { costRisk, reason: reason.trim(), suspectedUnused };
  debugLogAnalysisResult(result);
  return result;
}

/**
 * Analyzes Public IP addresses to find unassociated or unused IPs.
 *
 * @param resource - The Azure public IP resource to analyze
 * @param networkClient - Azure Network management client
 * @param monitorClient - Azure Monitor client for metrics
 * @param timespanDays - Number of days to look back for metrics
 * @returns Analysis result with cost risk, reason, and usage status
 */
async function analyzePublicIp(
  resource: armResources.GenericResource,
  networkClient: NetworkManagementClient,
  monitorClient: MonitorClient,
  timespanDays: number,
) {
  debugLogResourceStart(
    resource.name || "unknown",
    "Public IP (microsoft.network/publicipaddresses)",
  );
  debugLog("Resource details:", resource);

  const costRisk: "high" | "low" | "medium" = "medium";
  let reason = "";

  if (!resource.id) {
    return {
      costRisk,
      reason: "Resource ID is missing.",
      suspectedUnused: false,
    };
  }

  // Extract resource group and public IP name from resource ID
  const resourceParts = resource.id.split("/");
  const resourceGroupName = resourceParts[4];
  const publicIpName = resourceParts[8];

  try {
    // Get detailed Public IP information
    const publicIpDetails = await networkClient.publicIPAddresses.get(
      resourceGroupName,
      publicIpName,
    );

    debugLog("Public IP API details:", publicIpDetails);

    // Check if Public IP is not associated with any resource
    if (!publicIpDetails.ipConfiguration && !publicIpDetails.natGateway) {
      reason += "Public IP not associated with any resource. ";
    }

    // Check if it's a static IP that might be unused
    if (
      publicIpDetails.publicIPAllocationMethod === "Static" &&
      !publicIpDetails.ipConfiguration
    ) {
      reason += "Static IP not in use. ";
    }

    // Check network metrics for low usage
    const bytesInDDoS = await getMetric(
      monitorClient,
      resource.id,
      "BytesInDDoS",
      "Total",
      timespanDays,
    );

    if (bytesInDDoS !== null && bytesInDDoS < 1000000) {
      // Less than 1MB total in 30 days
      reason += `Very low network traffic (${(bytesInDDoS / 1024 / 1024).toFixed(2)} MB). `;
    }
  } catch (error) {
    console.warn(
      `Failed to get Public IP details for ${publicIpName}: ${error instanceof Error ? error.message : error}`,
    );
    reason += "Could not retrieve detailed Public IP information. ";
  }

  const suspectedUnused = reason.length > 0;
  const result = { costRisk, reason: reason.trim(), suspectedUnused };
  debugLogAnalysisResult(result);
  return result;
}

/**
 * Dispatches analysis to the appropriate function based on resource type.
 *
 * @param resource - The Azure resource to analyze
 * @param monitorClient - Azure Monitor client for metrics
 * @param computeClient - Azure Compute management client
 * @param networkClient - Azure Network management client
 * @param webSiteClient - Azure App Service management client
 * @param preferredLocation - Preferred Azure region for resources
 * @param timespanDays - Number of days to look back for metrics
 * @returns Analysis result with cost risk, reason, and usage status
 */
async function analyzeResource(
  resource: armResources.GenericResource,
  monitorClient: MonitorClient,
  computeClient: ComputeManagementClient,
  networkClient: NetworkManagementClient,
  webSiteClient: WebSiteManagementClient,
  preferredLocation: string,
  timespanDays: number,
): Promise<{
  costRisk: "high" | "low" | "medium";
  reason: string;
  suspectedUnused: boolean;
}> {
  /**
   * Merges analysis results, preserving existing reasons and combining suspectedUnused flags.
   */
  const mergeResults = (
    baseResult: {
      costRisk: "high" | "low" | "medium";
      reason: string;
      suspectedUnused: boolean;
    },
    specificResult: {
      costRisk: "high" | "low" | "medium";
      reason: string;
      suspectedUnused: boolean;
    },
  ) => ({
    costRisk: specificResult.costRisk,
    reason: baseResult.reason + specificResult.reason,
    suspectedUnused:
      baseResult.suspectedUnused || specificResult.suspectedUnused,
  });

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
    case "microsoft.compute/disks": {
      const diskResult = await analyzeDisk(resource, computeClient);
      result = mergeResults(result, diskResult);
      break;
    }
    case "microsoft.compute/virtualmachines": {
      const vmResult = await analyzeVM(
        resource,
        monitorClient,
        computeClient,
        timespanDays,
      );
      result = mergeResults(result, vmResult);
      break;
    }
    case "microsoft.network/networkinterfaces": {
      const nicResult = await analyzeNic(resource, networkClient);
      result = mergeResults(result, nicResult);
      break;
    }
    case "microsoft.network/privateendpoints": {
      const peResult = await analyzePrivateEndpoint(resource, networkClient);
      result = mergeResults(result, peResult);
      break;
    }
    case "microsoft.network/publicipaddresses": {
      const pipResult = await analyzePublicIp(
        resource,
        networkClient,
        monitorClient,
        timespanDays,
      );
      result = mergeResults(result, pipResult);
      break;
    }
    case "microsoft.storage/storageaccounts": {
      const storageResult = await analyzeStorageAccount(
        resource,
        monitorClient,
        timespanDays,
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
      );
      result = mergeResults(result, aspResult);
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

/**
 * Main logic — analyze resources for all subscriptions.
 *
 * @param config - Configuration object with subscription IDs and settings
 * @param format - Output format (json, yaml, table, or detailed-json)
 */
async function analyzeResources(
  config: Config,
  format: "detailed-json" | "json" | "table" | "yaml",
) {
  const credential = new DefaultAzureCredential();
  const allReports: DetailedResourceReport[] = [];

  for (const subscriptionId of config.subscriptionIds) {
    console.log(`\n🔹 Analyzing subscription: ${subscriptionId}`);

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

    // Use the async iterator to avoid memory explosion for large environments
    for await (const resource of resourceClient.resources.list()) {
      const { costRisk, reason, suspectedUnused } = await analyzeResource(
        resource,
        monitorClient,
        computeClient,
        networkClient,
        webSiteClient,
        config.preferredLocation,
        config.timespanDays,
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
 * Analyzes Storage Accounts for low transaction activity.
 *
 * @param resource - The Azure storage account resource to analyze
 * @param monitorClient - Azure Monitor client for metrics
 * @param timespanDays - Number of days to look back for metrics
 * @returns Analysis result with cost risk, reason, and usage status
 */
async function analyzeStorageAccount(
  resource: armResources.GenericResource,
  monitorClient: MonitorClient,
  timespanDays: number,
) {
  debugLogResourceStart(
    resource.name || "unknown",
    "Storage Account (microsoft.storage/storageaccounts)",
  );
  debugLog("Resource details:", resource);

  const costRisk: "high" | "low" | "medium" = "medium";
  if (!resource.id) {
    return {
      costRisk,
      reason: "Resource ID is missing.",
      suspectedUnused: false,
    };
  }
  const transactions = await getMetric(
    monitorClient,
    resource.id,
    "Transactions",
    "Total",
    timespanDays,
  );
  if (transactions !== null && transactions < 100) {
    // Very low transactions
    const result = {
      costRisk,
      reason: `Very low transaction count (${transactions}). `,
      suspectedUnused: true,
    };
    debugLogAnalysisResult(result);
    return result;
  }
  const result = { costRisk, reason: "", suspectedUnused: false };
  debugLogAnalysisResult(result);
  return result;
}

/**
 * Analyzes Virtual Machines for deallocated/stopped state and low resource utilization.
 *
 * @param resource - The Azure virtual machine resource to analyze
 * @param monitorClient - Azure Monitor client for metrics
 * @param computeClient - Azure Compute management client
 * @param timespanDays - Number of days to look back for metrics
 * @returns Analysis result with cost risk, reason, and usage status
 */
async function analyzeVM(
  resource: armResources.GenericResource,
  monitorClient: MonitorClient,
  computeClient: ComputeManagementClient,
  timespanDays: number,
) {
  debugLogResourceStart(
    resource.name || "unknown",
    "Virtual Machine (microsoft.compute/virtualmachines)",
  );
  debugLog("Resource details:", resource);

  const costRisk: "high" | "low" | "medium" = "high";
  let reason = "";

  if (!resource.id) {
    return {
      costRisk,
      reason: "Resource ID is missing.",
      suspectedUnused: false,
    };
  }

  // Extract resource group and VM name from resource ID
  const resourceParts = resource.id.split("/");
  const resourceGroupName = resourceParts[4];
  const vmName = resourceParts[8];

  try {
    // Get the actual VM instance view to check power state
    const instanceView = await computeClient.virtualMachines.instanceView(
      resourceGroupName,
      vmName,
    );

    debugLog("VM Instance View:", instanceView);

    // Check power state from instance view
    const vmStatus = instanceView.statuses?.find((s: { code?: string }) =>
      s.code?.startsWith("PowerState/"),
    );

    if (vmStatus?.code === "PowerState/deallocated") {
      const result = {
        costRisk,
        reason: "VM is deallocated. ",
        suspectedUnused: true,
      };
      debugLogAnalysisResult(result);
      return result;
    }

    if (vmStatus?.code === "PowerState/stopped") {
      const result = {
        costRisk,
        reason: "VM is stopped. ",
        suspectedUnused: true,
      };
      debugLogAnalysisResult(result);
      return result;
    }
  } catch (error) {
    console.warn(
      `Failed to get VM instance view for ${vmName}: ${error instanceof Error ? error.message : error}`,
    );
    // Continue with metric analysis if instance view fails
  }

  // Check metrics for low utilization
  const cpuUsage = await getMetric(
    monitorClient,
    resource.id,
    "Percentage CPU",
    "Average",
    timespanDays,
  );
  const networkIn = await getMetric(
    monitorClient,
    resource.id,
    "Network In Total",
    "Total",
    timespanDays,
  );

  if (cpuUsage !== null && cpuUsage < 1) {
    // Less than 1% average CPU
    reason += `Low CPU usage (avg ${cpuUsage.toFixed(2)}%). `;
  }
  if (networkIn !== null && networkIn < 1024 * 1024 * 10) {
    // Less than 10MB total network in
    reason += `Low network traffic. `;
  }

  const result = { costRisk, reason, suspectedUnused: reason.length > 0 };
  debugLogAnalysisResult(result);
  return result;
}

/**
 * Debug logging function - only logs if DEBUG_MODE is enabled.
 *
 * @param message - The message to log
 * @param object - Optional object to stringify and log
 */
function debugLog(message: string, object?: unknown) {
  if (DEBUG_MODE) {
    if (object !== undefined) {
      console.log(message, JSON.stringify(object, null, 2));
    } else {
      console.log(message);
    }
  }
}

/**
 * Logs the analysis result for a resource.
 *
 * @param result - The analysis result object
 */
function debugLogAnalysisResult(result: {
  costRisk: "high" | "low" | "medium";
  reason: string;
  suspectedUnused: boolean;
}) {
  if (DEBUG_MODE) {
    console.log("\n📊 ANALYSIS RESULT:");
    console.log(`   Cost Risk: ${result.costRisk.toUpperCase()}`);
    console.log(
      `   Suspected Unused: ${result.suspectedUnused ? "YES" : "NO"}`,
    );
    console.log(`   Reason: ${result.reason || "No issues found"}`);
    console.log("=".repeat(80) + "\n");
  }
}

/**
 * Logs a resource analysis header with visual separator.
 *
 * @param resourceName - Name of the resource being analyzed
 * @param resourceType - Type of the resource
 */
function debugLogResourceStart(resourceName: string, resourceType: string) {
  if (DEBUG_MODE) {
    console.log("\n" + "=".repeat(80));
    console.log(`🔍 ANALYZING: ${resourceName}`);
    console.log(`   Type: ${resourceType}`);
    console.log("=".repeat(80));
  }
}

/**
 * Generates the final report in the specified format.
 *
 * @param report - Array of detailed resource reports
 * @param format - Output format (json, yaml, table, or detailed-json)
 */
async function generateReport(
  report: DetailedResourceReport[],
  format: "detailed-json" | "json" | "table" | "yaml",
) {
  if (format === "detailed-json") {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // For other formats, we extract the summary data.
  const summaryReport: ResourceReport[] = report.map((r) => ({
    costRisk: r.analysis.costRisk,
    location: r.resource.location ?? "",
    name: r.resource.name ?? "unknown",
    reason: r.analysis.reason,
    resourceGroup: r.resource.id?.split("/")[4],
    subscriptionId: r.resource.id?.split("/")[2] ?? "unknown",
    suspectedUnused: r.analysis.suspectedUnused,
    type: r.resource.type ?? "unknown",
  }));

  if (format === "json") {
    console.log(JSON.stringify(summaryReport, null, 2));
  } else if (format === "yaml") {
    console.log(yaml.dump(summaryReport));
  } else {
    const tableData = [
      ["Name", "Type", "Resource Group", "Risk", "Unused", "Reason"],
      ...summaryReport.map((r) => [
        r.name,
        r.type,
        r.resourceGroup || "N/A",
        r.costRisk,
        r.suspectedUnused ? "Yes" : "No",
        r.reason,
      ]),
    ];

    const output = table(tableData);
    console.log(output);
  }
}

/**
 * Fetches a specific metric for a resource from Azure Monitor.
 *
 * @param monitorClient - The Azure Monitor client instance
 * @param resourceId - The Azure resource ID
 * @param metricName - The name of the metric to fetch (e.g., "Percentage CPU")
 * @param aggregation - The aggregation type (e.g., "Average", "Total")
 * @param timespanDays - Number of days to look back for metrics
 * @returns The metric value or null if unavailable
 */
async function getMetric(
  monitorClient: MonitorClient,
  resourceId: string,
  metricName: string,
  aggregation: string,
  timespanDays: number,
): Promise<null | number> {
  try {
    const timespan = `P${timespanDays}D`;
    const result = await monitorClient.metrics.list(resourceId, {
      aggregation,
      metricnames: metricName,
      timespan,
    });

    const metricData = result.value[0]?.timeseries?.[0]?.data?.[0];
    if (!metricData) {
      return null;
    }

    const aggregationLower = aggregation.toLowerCase();

    if (
      aggregationLower === "average" &&
      typeof metricData.average === "number"
    ) {
      return metricData.average;
    }
    if (aggregationLower === "total" && typeof metricData.total === "number") {
      return metricData.total;
    }
    if (
      aggregationLower === "minimum" &&
      typeof metricData.minimum === "number"
    ) {
      return metricData.minimum;
    }
    if (
      aggregationLower === "maximum" &&
      typeof metricData.maximum === "number"
    ) {
      return metricData.maximum;
    }
    if (aggregationLower === "count" && typeof metricData.count === "number") {
      return metricData.count;
    }

    return null;
  } catch (error) {
    console.error(
      `Failed to fetch metric ${metricName} for resource ${resourceId}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Loads configuration from file, environment variables, or interactive prompts.
 *
 * @param configPath - Optional path to JSON configuration file
 * @returns Configuration object with subscription IDs and settings
 */
async function loadConfig(configPath?: string): Promise<Config> {
  if (configPath && fs.existsSync(configPath)) {
    try {
      const configContent = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(configContent);

      // Validate required fields
      if (!config.tenantId || !config.subscriptionIds) {
        throw new Error(
          "Config file must contain 'tenantId' and 'subscriptionIds'",
        );
      }

      return {
        ...config,
        preferredLocation: config.preferredLocation || "italynorth",
        timespanDays: config.timespanDays || 30,
      };
    } catch (error) {
      throw new Error(
        `Failed to load config file: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  console.log(
    "Configuration file not found. Checking environment variables...",
  );

  const tenantId =
    process.env.ARM_TENANT_ID || (await prompt("Enter Tenant ID: "));
  const subscriptionIds = process.env.ARM_SUBSCRIPTION_ID
    ? process.env.ARM_SUBSCRIPTION_ID.split(",")
    : (await prompt("Enter Subscription IDs (comma-separated): ")).split(",");

  return {
    preferredLocation: "italynorth",
    subscriptionIds,
    tenantId,
    timespanDays: 30,
  };
}

/**
 * Prompts user for input via stdin.
 *
 * @param question - The question to display to the user
 * @returns User's input as a string
 */
async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    }),
  );
}

program
  .name("dx-az-save-money")
  .description(
    "Analyze Azure resources and generate a report of potentially unused or cost-inefficient ones.",
  )
  .option("-c, --config <path>", "Path to configuration file (JSON)")
  .option(
    "-f, --format <format>",
    "Report format: json, yaml, table, or detailed-json (default: table)",
    DEBUG_MODE ? "detailed-json" : "table",
  )
  .option(
    "-l, --location <string>",
    "Preferred Azure location for resources",
    "italynorth",
  )
  .option("-d, --days <number>", "Number of days for metrics analysis", "30")
  .option("--debug", "Enable debug logging")
  .action(async (options) => {
    try {
      // Set debug mode based on command line flag
      DEBUG_MODE = options.debug || false;

      const config = await loadConfig(options.config);
      config.timespanDays = parseInt(options.days, 10) || config.timespanDays;
      config.preferredLocation = options.location || config.preferredLocation;

      await analyzeResources(config, options.format);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse(process.argv);
