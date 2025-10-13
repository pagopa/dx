#!/usr/bin/env node

/**
 * mark-unused-resources.ts
 *
 * Read-only CLI that analyzes Azure resources and reports
 * potentially unused or cost-inefficient ones.
 *
 * It does NOT modify, tag, or delete any resource.
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
 * Fetches a specific metric for a resource.
 */
async function getMetric(
  monitorClient: MonitorClient,
  resourceId: string,
  metricName: string,
  aggregation: string,
  timespanDays: number,
): Promise<null | number> {
  try {
    const timespan = `P${timespanDays}D`; // Use dynamic timespan
    const result = await monitorClient.metrics.list(resourceId, {
      aggregation,
      metricnames: metricName,
      timespan,
    });

    const metricData = result.value[0]?.timeseries?.[0]?.data?.[0];
    let value: null | number = null;
    if (metricData) {
      // Aggregation can be "average", "total", etc.
      if (
        aggregation.toLowerCase() === "average" &&
        typeof metricData.average === "number"
      ) {
        value = metricData.average;
      } else if (
        aggregation.toLowerCase() === "total" &&
        typeof metricData.total === "number"
      ) {
        value = metricData.total;
      } else if (
        aggregation.toLowerCase() === "minimum" &&
        typeof metricData.minimum === "number"
      ) {
        value = metricData.minimum;
      } else if (
        aggregation.toLowerCase() === "maximum" &&
        typeof metricData.maximum === "number"
      ) {
        value = metricData.maximum;
      } else if (
        aggregation.toLowerCase() === "count" &&
        typeof metricData.count === "number"
      ) {
        value = metricData.count;
      }
    }

    return typeof value === "number" ? value : null;
  } catch (error) {
    console.error(
      `Failed to get metric ${metricName} for ${resourceId}:`,
      error,
    );
    return null;
  }
}

async function loadConfig(configPath?: string): Promise<Config> {
  if (configPath && fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configContent);
    return {
      ...config,
      preferredLocation: config.preferredLocation || "italynorth",
      timespanDays: config.timespanDays || 30,
    };
  }

  console.log(
    "Configuration file not found. Checking environment variables...",
  );

  const tenantId =
    process.env.ARM_TENANT_ID || (await prompt("Enter Tenant ID: "));
  const subscriptionIds = process.env.ARM_SUBSCRIPTION_ID
    ? process.env.ARM_SUBSCRIPTION_ID.split(",")
    : (await prompt("Enter Subscription IDs (comma-separated): ")).split(",");
  // const timespanDaysStr = await prompt("Enter timespan in days for metrics (default: 30): ");
  // const timespanDays = timespanDaysStr ? parseInt(timespanDaysStr, 10) : 30;

  return {
    preferredLocation: "italynorth", // Default value if not provided in config file
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
  .name("mark-unused-resources")
  .description(
    "Analyze Azure resources and generate a report of potentially unused or cost-inefficient ones.",
  )
  .option("-c, --config <path>", "Path to configuration file (JSON)")
  .option(
    "-f, --format <format>",
    "Report format (json, yaml, table, detailed-json)",
    "table",
  )
  .option(
    "-l, --location <string>",
    "Preferred location where resources are deployed",
    "italynorth",
  )
  .option("-d, --days <number>", "Timespan in days for metrics analysis", "30")
  .action(async (options) => {
    const config = await loadConfig(options.config);
    config.timespanDays = parseInt(options.days, 10) || config.timespanDays;
    config.preferredLocation = options.location || config.preferredLocation;
    await analyzeResources(config, options.format);
  });

program.parse(process.argv);
