/**
 * Integration tests for global query configuration propagation and
 * dashboard name sanitization.
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { AzDashboardRawBuilder } from "@/builders/azure-dashboard-raw/index.js";
import { AzDashboardBuilder } from "@/builders/azure-dashboard/index.js";
import { OA3Resolver } from "@/core/resolver/index.js";

const SPEC_PATH = "test/data/io_backend_light.yaml";
const DATA_SOURCE_ID =
  "/subscriptions/uuid/resourceGroups/io-p-rg-external/providers/Microsoft.Network/applicationGateways/io-p-appgateway";

/**
 * Minimal shape of the raw dashboard JSON we assert on. Parsing it at runtime
 * keeps the test honest about the generated structure instead of casting
 * `JSON.parse()` output with a type assertion.
 */
const RawDashboardSchema = z.object({
  name: z.string(),
  tags: z.record(z.string(), z.string()),
});

function parseRawDashboard(json: string) {
  return RawDashboardSchema.parse(JSON.parse(json));
}

async function resolveSpec() {
  const resolver = new OA3Resolver(SPEC_PATH);
  return resolver.resolve();
}

describe("Query config propagation (response_time_percentile)", () => {
  it("should use the configured percentile in the raw dashboard query and metadata", async () => {
    const oa3Spec = await resolveSpec();

    const builder = new AzDashboardRawBuilder({
      evaluationFrequency: 10,
      evaluationTimeWindow: 20,
      eventOccurrences: 1,
      location: "West Europe",
      name: "Percentile Dashboard",
      oa3Spec,
      queries: {
        response_time_percentile: 99,
        status_code_categories: ["2XX", "5XX"],
      },
      resourceGroup: "dashboards",
      resources: [DATA_SOURCE_ID],
      resourceType: "app-gateway",
      timespan: "5m",
    });

    const output = builder.produce({});

    expect(output).toContain("duration_percentile_99");
    expect(output).not.toContain("duration_percentile_95");
  });

  it("should use an identifier-safe field name for fractional percentiles", async () => {
    const oa3Spec = await resolveSpec();

    const builder = new AzDashboardRawBuilder({
      evaluationFrequency: 10,
      evaluationTimeWindow: 20,
      eventOccurrences: 1,
      location: "West Europe",
      name: "Fractional Percentile Dashboard",
      oa3Spec,
      queries: {
        response_time_percentile: 99.9,
        status_code_categories: ["2XX", "5XX"],
      },
      resourceGroup: "dashboards",
      resources: [DATA_SOURCE_ID],
      resourceType: "app-gateway",
      timespan: "5m",
    });

    const output = builder.produce({});

    // The query alias and the chart metadata must share the same
    // identifier-safe field name, otherwise the chart stays empty.
    expect(output).toContain("duration_percentile_99_9=percentiles");
    expect(output).toContain('"name": "duration_percentile_99_9"');
    expect(output).not.toContain("duration_percentile_99.9");
  });

  it("should propagate the global percentile to Terraform alarms", async () => {
    const oa3Spec = await resolveSpec();

    const rawBuilder = new AzDashboardRawBuilder({
      evaluationFrequency: 10,
      evaluationTimeWindow: 20,
      eventOccurrences: 1,
      location: "West Europe",
      name: "Percentile Dashboard",
      oa3Spec,
      queries: {
        response_time_percentile: 99,
        status_code_categories: ["2XX", "5XX"],
      },
      resourceGroup: "dashboards",
      resources: [DATA_SOURCE_ID],
      resourceType: "app-gateway",
      timespan: "5m",
    });

    const builder = new AzDashboardBuilder({
      actionGroupsIds: [
        "/subscriptions/uuid/resourceGroups/my-rg/providers/microsoft.insights/actionGroups/my-action-group",
      ],
      dashboardBuilder: rawBuilder,
      dataSourceId: DATA_SOURCE_ID,
      evaluationFrequency: 10,
      evaluationTimeWindow: 20,
      eventOccurrences: 1,
      location: "West Europe",
      name: "Percentile Dashboard",
      resourceType: "app-gateway",
      timespan: "5m",
    });

    // generate.ts passes only `config.overrides` (no queries here), so the
    // global config.queries must still reach the Terraform alarm queries.
    const output = builder.produce({});

    expect(output).toContain("duration_percentile_99 > threshold");
    expect(output).not.toContain("duration_percentile_95 > threshold");
    expect(output).toContain("duration_percentile_99");
    expect(output).not.toContain("duration_percentile_95");
  });
});

describe("Dashboard name sanitization", () => {
  it("should sanitize invalid characters in the raw dashboard name", async () => {
    const oa3Spec = await resolveSpec();

    const builder = new AzDashboardRawBuilder({
      evaluationFrequency: 10,
      evaluationTimeWindow: 20,
      eventOccurrences: 1,
      location: "West Europe",
      name: "PROD-IO/IO_App.Availability",
      oa3Spec,
      resourceGroup: "dashboards",
      resources: [DATA_SOURCE_ID],
      resourceType: "app-gateway",
      timespan: "5m",
    });

    const dashboard = parseRawDashboard(builder.produce({}));

    expect(dashboard.name).toBe("PROD-IO_IO_App_Availability");
    expect(dashboard.tags["hidden-title"]).toBe("PROD-IO/IO_App.Availability");
  });

  it("should only emit valid characters in the Terraform dashboard name", async () => {
    const oa3Spec = await resolveSpec();

    const rawBuilder = new AzDashboardRawBuilder({
      evaluationFrequency: 10,
      evaluationTimeWindow: 20,
      eventOccurrences: 1,
      location: "West Europe",
      name: "PROD-IO/IO_App.Availability",
      oa3Spec,
      resourceGroup: "dashboards",
      resources: [DATA_SOURCE_ID],
      resourceType: "app-gateway",
      timespan: "5m",
    });

    const builder = new AzDashboardBuilder({
      actionGroupsIds: [
        "/subscriptions/uuid/resourceGroups/my-rg/providers/microsoft.insights/actionGroups/my-action-group",
      ],
      dashboardBuilder: rawBuilder,
      dataSourceId: DATA_SOURCE_ID,
      evaluationFrequency: 10,
      evaluationTimeWindow: 20,
      eventOccurrences: 1,
      location: "West Europe",
      name: "PROD-IO/IO_App.Availability",
      resourceType: "app-gateway",
      timespan: "5m",
    });

    const output = builder.produce({});

    expect(output).toContain(
      'name                = "${var.prefix}-${var.env_short}-PROD-IO_IO_App_Availability"',
    );
  });
});

describe("Response codes categories", () => {
  it("should use the configured categories in the dashboard query", async () => {
    const oa3Spec = await resolveSpec();

    const builder = new AzDashboardRawBuilder({
      evaluationFrequency: 10,
      evaluationTimeWindow: 20,
      eventOccurrences: 1,
      location: "West Europe",
      name: "Categories Dashboard",
      oa3Spec,
      queries: {
        response_time_percentile: 95,
        status_code_categories: ["2XX", "5XX"],
      },
      resourceGroup: "dashboards",
      resources: [DATA_SOURCE_ID],
      resourceType: "app-gateway",
      timespan: "5m",
    });

    const output = builder.produce({});

    expect(output).toContain("httpStatus_d between (200 .. 299)");
    expect(output).toContain("httpStatus_d between (500 .. 599)");
    expect(output).toContain('\\"2XX\\"');
    expect(output).toContain('\\"5XX\\"');
    expect(output).toContain('\\"Other\\"');
    expect(output).not.toContain('\\"1XX\\"');
  });

  it("should not emit a fabricated filteredPartIds list", async () => {
    const oa3Spec = await resolveSpec();

    const builder = new AzDashboardRawBuilder({
      evaluationFrequency: 10,
      evaluationTimeWindow: 20,
      eventOccurrences: 1,
      location: "West Europe",
      name: "Filters Dashboard",
      oa3Spec,
      resourceGroup: "dashboards",
      resources: [DATA_SOURCE_ID],
      resourceType: "app-gateway",
      timespan: "5m",
    });

    const output = builder.produce({});

    expect(output).toContain('"filteredPartIds": []');
    expect(output).not.toContain("StartboardPart-");
  });
});

describe("Alert descriptions", () => {
  it("should describe the configured thresholds", async () => {
    const oa3Spec = await resolveSpec();

    const rawBuilder = new AzDashboardRawBuilder({
      evaluationFrequency: 10,
      evaluationTimeWindow: 20,
      eventOccurrences: 1,
      location: "West Europe",
      name: "Descriptions Dashboard",
      oa3Spec,
      resourceGroup: "dashboards",
      resources: [DATA_SOURCE_ID],
      resourceType: "app-gateway",
      timespan: "5m",
    });

    const builder = new AzDashboardBuilder({
      actionGroupsIds: [
        "/subscriptions/uuid/resourceGroups/my-rg/providers/microsoft.insights/actionGroups/my-action-group",
      ],
      dashboardBuilder: rawBuilder,
      dataSourceId: DATA_SOURCE_ID,
      evaluationFrequency: 10,
      evaluationTimeWindow: 20,
      eventOccurrences: 1,
      location: "West Europe",
      name: "Descriptions Dashboard",
      resourceType: "app-gateway",
      timespan: "5m",
    });

    const output = builder.produce({
      endpoints: {
        "/api/v1/services/{service_id}": {
          availability_threshold: 0.95,
          response_time_threshold: 2,
        },
      },
    });

    expect(output).toContain("is below 95%");
    expect(output).toContain("is above 2s");
    expect(output).not.toContain("less than or equal to");
  });
});
