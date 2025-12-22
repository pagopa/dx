/* eslint-disable max-lines-per-function */
/**
 * Integration tests for HTTP method-specific filtering.
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { AzDashboardRawBuilder } from "@/builders/azure-dashboard-raw/index.js";
import { AzDashboardBuilder } from "@/builders/azure-dashboard/index.js";
import { loadConfig } from "@/core/config/loader.js";
import { OA3Resolver } from "@/core/resolver/index.js";

describe("HTTP Methods - Integration Tests", () => {
  it("should load config with HTTP method overrides", async () => {
    const config = await loadConfig(
      "examples/azure_dashboard_http_methods_config.yaml",
    );

    expect(config.overrides).toBeDefined();
    expect(config.overrides?.endpoints).toBeDefined();

    const serviceIdEndpoint =
      config.overrides?.endpoints?.["GET /api/v1/services/{service_id}"];
    expect(serviceIdEndpoint).toBeDefined();
    expect(serviceIdEndpoint?.availability_threshold).toBe(0.95);

    const servicesEndpoint =
      config.overrides?.endpoints?.["GET /api/v1/services"];
    expect(servicesEndpoint).toBeDefined();
    expect(servicesEndpoint?.availability_threshold).toBe(0.98);
  });

  it("should generate dashboard with method-specific filtering", async () => {
    const specPath = "test/data/io_backend_light.yaml";
    const resolver = new OA3Resolver(specPath);
    const oa3Spec = await resolver.resolve();

    const resourceIds = [
      "/subscriptions/test/resourceGroups/test/providers/Microsoft.Network/applicationGateways/test",
    ];

    const rawBuilder = new AzDashboardRawBuilder({
      evaluationFrequency: 10,
      evaluationTimeWindow: 20,
      eventOccurrences: 1,
      location: "West Europe",
      name: "HTTP Methods Test Dashboard",
      oa3Spec,
      resources: resourceIds,
      resourceType: "app-gateway",
      timespan: "5m",
    });

    const overrides = {
      endpoints: {
        "GET /api/v1/services": {
          availabilityThreshold: 0.98,
          responseTimeThreshold: 2.0,
        },
        "GET /api/v1/services/{service_id}": {
          availabilityThreshold: 0.95,
          responseTimeThreshold: 1.5,
        },
      },
    };

    const output = rawBuilder.produce(overrides);

    // Verify the output contains method filtering
    expect(output).toMatch(/httpMethod_s == .*GET/);

    // Verify it contains the correct endpoints
    expect(output).toContain("/api/v1/services/{service_id}");
    expect(output).toContain("/api/v1/services");

    // Verify custom thresholds are applied
    expect(output).toContain("let threshold = 0.95");
    expect(output).toContain("let threshold = 0.98");
    expect(output).toContain("let threshold = 1.5");
    expect(output).toContain("let threshold = 2");
  });

  it("should generate Terraform package with method filtering", async () => {
    const specPath = "test/data/io_backend_light.yaml";
    const resolver = new OA3Resolver(specPath);
    const oa3Spec = await resolver.resolve();

    const dataSourceId =
      "/subscriptions/uuid/resourceGroups/io-p-rg-external/providers/Microsoft.Network/applicationGateways/io-p-appgateway";
    const resourceIds = [dataSourceId];
    const actionGroups = [
      "/subscriptions/uuid/resourceGroups/my-rg/providers/microsoft.insights/actionGroups/my-action-group",
    ];

    const rawBuilder = new AzDashboardRawBuilder({
      evaluationFrequency: 10,
      evaluationTimeWindow: 20,
      eventOccurrences: 2,
      location: "West Europe",
      name: "Test Dashboard",
      oa3Spec,
      resources: resourceIds,
      resourceType: "app-gateway",
      timespan: "5m",
    });

    const builder = new AzDashboardBuilder({
      actionGroupsIds: actionGroups,
      dashboardBuilder: rawBuilder,
      dataSourceId,
      evaluationFrequency: 10,
      evaluationTimeWindow: 20,
      eventOccurrences: 2,
      location: "West Europe",
      name: "PROD-IO/IO_HTTP_Methods_Test",
      resourceType: "app-gateway",
      timespan: "5m",
    });

    const tempDir = mkdtempSync(join(tmpdir(), "http-methods-test-"));

    try {
      const overrides = {
        endpoints: {
          "GET /api/v1/services/{service_id}": {
            availabilityThreshold: 0.9,
            responseTimeThreshold: 1.0,
          },
        },
      };

      await builder.package(tempDir, overrides);

      const opexTfPath = join(tempDir, "opex.tf");
      const output = readFileSync(opexTfPath, "utf-8");

      // Verify Terraform output contains method filtering in queries
      expect(output).toContain('| where httpMethod_s == "GET"');

      // Verify alarm resources are created
      expect(output).toContain("azurerm_monitor_scheduled_query_rules_alert");

      // Verify custom threshold is used
      expect(output).toContain("let threshold = 0.9");
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("should handle mixed endpoints with and without method filters", async () => {
    const specPath = "test/data/io_backend_light.yaml";
    const resolver = new OA3Resolver(specPath);
    const oa3Spec = await resolver.resolve();

    const resourceIds = [
      "/subscriptions/test/resourceGroups/test/providers/Microsoft.Network/applicationGateways/test",
    ];

    const rawBuilder = new AzDashboardRawBuilder({
      evaluationFrequency: 10,
      evaluationTimeWindow: 20,
      eventOccurrences: 1,
      location: "West Europe",
      name: "Mixed Methods Test",
      oa3Spec,
      resources: resourceIds,
      resourceType: "app-gateway",
      timespan: "5m",
    });

    const overrides = {
      endpoints: {
        // Without method filter (backward compatible)
        "/api/v1/services": {
          availabilityThreshold: 0.98,
        },
        // With method filter
        "GET /api/v1/services/{service_id}": {
          availabilityThreshold: 0.95,
        },
      },
    };

    const output = rawBuilder.produce(overrides);

    // Should contain method filtering for service_id endpoint
    const serviceIdMatches = output.match(
      /\/api\/v1\/services\/\[.*?\].*?httpMethod_s/s,
    );
    expect(serviceIdMatches).toBeTruthy();

    // Should not contain method filtering for services endpoint in some places
    // (but this is hard to test precisely without parsing the entire structure)
    expect(output).toContain("/api/v1/services");
  });

  it("should apply method filtering to API Management resource type", async () => {
    const specPath = "test/data/io_backend_light.yaml";
    const resolver = new OA3Resolver(specPath);
    const oa3Spec = await resolver.resolve();

    const resourceIds = [
      "/subscriptions/test/resourceGroups/test/providers/Microsoft.ApiManagement/service/test",
    ];

    const rawBuilder = new AzDashboardRawBuilder({
      evaluationFrequency: 10,
      evaluationTimeWindow: 20,
      eventOccurrences: 1,
      location: "West Europe",
      name: "API Management Test",
      oa3Spec,
      resources: resourceIds,
      resourceType: "api-management",
      timespan: "5m",
    });

    const overrides = {
      endpoints: {
        "GET /api/v1/services/{service_id}": {
          availabilityThreshold: 0.95,
        },
      },
    };

    const output = rawBuilder.produce(overrides);

    // API Management uses method_s instead of httpMethod_s (in escaped JSON)
    expect(output).toMatch(/method_s == .*GET/);

    // Should include the responseCode_d != 0 filter
    expect(output).toContain("responseCode_d < 500 and responseCode_d != 0");
  });
});
