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

import { MonitorClient } from "@azure/arm-monitor";
import * as armResources from "@azure/arm-resources";
import { DefaultAzureCredential } from "@azure/identity";
import { Command } from "commander";
import * as fs from "fs";
import * as yaml from "js-yaml";
import * as readline from "readline";
import { table } from "table";

const program = new Command();

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

function analyzeAppServicePlan(resource: armResources.GenericResource) {
  const costRisk: "high" | "low" | "medium" = "medium";
  if (resource.properties?.numberOfSites === 0) {
    return {
      costRisk,
      reason: "App Service Plan has no associated apps. ",
      suspectedUnused: true,
    };
  }
  return { costRisk, reason: "", suspectedUnused: false };
}

function analyzeDisk(resource: armResources.GenericResource) {
  const costRisk: "high" | "low" | "medium" = "medium";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((resource.properties as any)?.diskState?.toLowerCase() === "unattached") {
    return { costRisk, reason: "Disk is unattached. ", suspectedUnused: true };
  }
  return { costRisk, reason: "", suspectedUnused: false };
}

function analyzeNic(resource: armResources.GenericResource) {
  const costRisk: "high" | "low" | "medium" = "low";
  if (
    !resource.properties?.virtualMachine &&
    !resource.properties?.privateEndpoint
  ) {
    return {
      costRisk,
      reason: "Network interface is not attached. ",
      suspectedUnused: true,
    };
  }
  return { costRisk, reason: "", suspectedUnused: false };
}

function analyzePublicIp(resource: armResources.GenericResource) {
  const costRisk: "high" | "low" | "medium" = "medium";
  if (!resource.properties?.ipConfiguration) {
    return {
      costRisk,
      reason: "Public IP is not associated. ",
      suspectedUnused: true,
    };
  }
  return { costRisk, reason: "", suspectedUnused: false };
}

// --- Analysis Hooks ---

/**
 * Dispatches analysis to the appropriate function based on resource type.
 */
async function analyzeResource(
  resource: armResources.GenericResource,
  monitorClient: MonitorClient,
  preferredLocation: string,
  timespanDays: number,
): Promise<{
  costRisk: "high" | "low" | "medium";
  reason: string;
  suspectedUnused: boolean;
}> {
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
    case "microsoft.compute/disks":
      result = { ...result, ...analyzeDisk(resource) };
      break;
    case "microsoft.compute/virtualmachines":
      result = {
        ...result,
        ...(await analyzeVM(resource, monitorClient, timespanDays)),
      };
      break;
    case "microsoft.network/networkinterfaces":
      result = { ...result, ...analyzeNic(resource) };
      break;
    case "microsoft.network/publicipaddresses":
      result = { ...result, ...analyzePublicIp(resource) };
      break;
    case "microsoft.storage/storageaccounts":
      result = {
        ...result,
        ...(await analyzeStorageAccount(resource, monitorClient, timespanDays)),
      };
      break;
    case "microsoft.web/serverfarms":
      result = { ...result, ...analyzeAppServicePlan(resource) };
      break;
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

    // Use the async iterator to avoid memory explosion for large environments
    for await (const resource of resourceClient.resources.list()) {
      const { costRisk, reason, suspectedUnused } = await analyzeResource(
        resource,
        monitorClient,
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

async function analyzeStorageAccount(
  resource: armResources.GenericResource,
  monitorClient: MonitorClient,
  timespanDays: number,
) {
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
    return {
      costRisk,
      reason: `Very low transaction count (${transactions}). `,
      suspectedUnused: true,
    };
  }
  return { costRisk, reason: "", suspectedUnused: false };
}

async function analyzeVM(
  resource: armResources.GenericResource,
  monitorClient: MonitorClient,
  timespanDays: number,
) {
  const costRisk: "high" | "low" | "medium" = "high";
  let reason = "";

  // Check power state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vmStatus = (resource.properties as any)?.instanceView?.statuses?.find(
    (s: { code: string }) => s.code.startsWith("PowerState/"),
  );
  if (vmStatus?.code === "PowerState/deallocated") {
    return { costRisk, reason: "VM is deallocated. ", suspectedUnused: true };
  }

  if (!resource.id) {
    return {
      costRisk,
      reason: "Resource ID is missing.",
      suspectedUnused: false,
    };
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

  return { costRisk, reason, suspectedUnused: reason.length > 0 };
}

/**
 * Generates the final report.
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
  .name("azure-resource-analyzer")
  .version("0.0.0")
  .description(
    "Analyze Azure resources and generate a report of potentially unused or cost-inefficient ones.",
  )
  .option("-c, --config <path>", "Path to configuration file (JSON)")
  .option(
    "-f, --format <format>",
    "Report format: json, yaml, table, or detailed-json",
    "table",
  )
  .option(
    "-l, --location <string>",
    "Preferred Azure location for resources",
    "italynorth",
  )
  .option("-d, --days <number>", "Number of days for metrics analysis", "30")
  .action(async (options) => {
    try {
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
