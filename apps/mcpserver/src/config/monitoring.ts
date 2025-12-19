/**
 * Azure Application Insights monitoring configuration for the MCP server.
 *
 * This configuration works in any environment (AWS Lambda, Azure Functions, local, etc.)
 * and sends telemetry data to Azure Application Insights.
 *
 * Required environment variable:
 * - APPLICATIONINSIGHTS_CONNECTION_STRING: The connection string for Azure Application Insights
 *
 * Optional environment variable:
 * - APPINSIGHTS_SAMPLING_PERCENTAGE: Sampling percentage (0-100), defaults to 5
 */

import { getLogger } from "@logtape/logtape";
import { initAzureMonitor } from "@pagopa/azure-tracing/azure-monitor";

const logger = getLogger(["mcpserver", "monitoring"]);

/**
 * Initializes Azure Monitor telemetry; logs a warning when configuration is missing.
 */
export function configureAzureMonitoring(): void {
  try {
    // Initialize Azure Monitor using environment variables
    // This will read APPLICATIONINSIGHTS_CONNECTION_STRING and APPINSIGHTS_SAMPLING_PERCENTAGE
    initAzureMonitor();

    logger.info(
      "Azure Application Insights monitoring configured successfully",
    );
  } catch (error) {
    logger.warn(
      `Failed to configure Azure monitoring: ${error instanceof Error ? error.message : String(error)}. Custom events will not be sent to Application Insights.`,
    );
  }
}
