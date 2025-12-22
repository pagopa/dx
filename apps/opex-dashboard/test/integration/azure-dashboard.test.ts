/**
 * Integration tests for Azure dashboard generation.
 * Tests end-to-end workflow from config to dashboard output.
 */

import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AzDashboardRawBuilder } from "@/builders/azure-dashboard-raw/index.js";
import { AzDashboardBuilder } from "@/builders/azure-dashboard/index.js";
import { type BuilderType, createBuilder } from "@/core/builder-factory.js";
import { loadConfig } from "@/core/config/index.js";
import { OA3Resolver } from "@/core/resolver/index.js";

describe("Azure Dashboard Integration Tests - Snapshots", () => {
  describe("snapshot tests with io_backend_light spec", () => {
    const actionGroups = [
      "/subscriptions/uuid/resourceGroups/my-rg/providers/microsoft.insights/actionGroups/my-action-group-email",
      "/subscriptions/uuid/resourceGroups/my-rg/providers/microsoft.insights/actionGroups/my-action-group-slack",
    ];
    const dataSourceId = "data_source_id";
    const resourceIds = [
      "/subscriptions/uuid/resourceGroups/io-p-rg-external/providers/Microsoft.Network/applicationGateways/io-p-appgateway",
    ];

    it("should match iobackend_light_no_overrides snapshot exactly", async () => {
      const specPath = "test/data/io_backend_light.yaml";
      const resolver = new OA3Resolver(specPath);
      const oa3Spec = await resolver.resolve();

      const rawBuilder = new AzDashboardRawBuilder(
        oa3Spec,
        "PROD-IO/IO_App_Availability",
        "app-gateway",
        "West Europe",
        "5m",
        10,
        20,
        2,
        resourceIds,
      );

      const builder = new AzDashboardBuilder(
        rawBuilder,
        "PROD-IO/IO_App_Availability",
        "app-gateway",
        "West Europe",
        "5m",
        10,
        20,
        2,
        dataSourceId,
        actionGroups,
        undefined,
      );

      const tempDir = mkdtempSync(join(tmpdir(), "opex-snapshot-test-"));

      try {
        await builder.package(tempDir, {});

        const opexTfPath = join(tempDir, "opex.tf");
        const output = readFileSync(opexTfPath, "utf-8");

        expect(output).toMatchSnapshot();
      } finally {
        rmSync(tempDir, { force: true, recursive: true });
      }
    });

    it("should match iobackend_light_overrides snapshot exactly", async () => {
      const specPath = "test/data/io_backend_light.yaml";
      const resolver = new OA3Resolver(specPath);
      const oa3Spec = await resolver.resolve();

      const rawBuilder = new AzDashboardRawBuilder(
        oa3Spec,
        "PROD-IO/IO_App_Availability",
        "app-gateway",
        "West Europe",
        "5m",
        10,
        20,
        2,
        resourceIds,
      );

      const builder = new AzDashboardBuilder(
        rawBuilder,
        "PROD-IO/IO_App_Availability",
        "app-gateway",
        "West Europe",
        "5m",
        10,
        20,
        2,
        dataSourceId,
        actionGroups,
        undefined,
      );

      const tempDir = mkdtempSync(join(tmpdir(), "opex-snapshot-test-"));

      try {
        const overrides = {
          endpoints: {
            "/api/v1/services/{service_id}": {
              availability_evaluation_frequency: 111,
              availability_evaluation_time_window: 222,
              availability_event_occurrences: 333,
              availability_threshold: 0.12,
              response_time_evaluation_frequency: 444,
              response_time_evaluation_time_window: 555,
              response_time_event_occurrences: 666,
              response_time_threshold: 0.23,
            },
          },
        };

        await builder.package(tempDir, overrides);

        const opexTfPath = join(tempDir, "opex.tf");
        const output = readFileSync(opexTfPath, "utf-8");

        expect(output).toMatchSnapshot();
      } finally {
        rmSync(tempDir, { force: true, recursive: true });
      }
    });

    it("should match iobackend_light_overrides_base_path snapshot exactly", async () => {
      const specPath = "test/data/io_backend_light.yaml";
      const resolver = new OA3Resolver(specPath);
      const oa3Spec = await resolver.resolve();

      const rawBuilder = new AzDashboardRawBuilder(
        oa3Spec,
        "PROD-IO/IO_App_Availability",
        "app-gateway",
        "West Europe",
        "5m",
        10,
        20,
        2,
        resourceIds,
      );

      const builder = new AzDashboardBuilder(
        rawBuilder,
        "PROD-IO/IO_App_Availability",
        "app-gateway",
        "West Europe",
        "5m",
        10,
        20,
        2,
        dataSourceId,
        actionGroups,
        undefined,
      );

      const tempDir = mkdtempSync(join(tmpdir(), "opex-snapshot-test-"));

      try {
        const overrides = {
          base_path: "basepath_override",
          endpoints: {
            "/api/v1/services/{service_id}": {
              availability_evaluation_frequency: 111,
              availability_evaluation_time_window: 222,
              availability_event_occurrences: 333,
              availability_threshold: 0.12,
              response_time_evaluation_frequency: 444,
              response_time_evaluation_time_window: 555,
              response_time_event_occurrences: 666,
              response_time_threshold: 0.23,
            },
          },
        };

        await builder.package(tempDir, overrides);

        const opexTfPath = join(tempDir, "opex.tf");
        const output = readFileSync(opexTfPath, "utf-8");

        expect(output).toMatchSnapshot();
      } finally {
        rmSync(tempDir, { force: true, recursive: true });
      }
    });
  });
});

describe("Azure Dashboard Integration Tests - Raw Builder", () => {
  describe("azure-dashboard-raw builder", () => {
    it("should generate dashboard with io_backend_light spec and no overrides", async () => {
      const specPath = "test/data/io_backend_light.yaml";
      const resolver = new OA3Resolver(specPath);
      const oa3Spec = await resolver.resolve();

      const builder = new AzDashboardRawBuilder(
        oa3Spec,
        "Test Dashboard",
        "app-gateway",
        "West Europe",
        "5m",
        10,
        20,
        1,
        [
          "/subscriptions/test/resourceGroups/test/providers/Microsoft.Network/applicationGateways/test",
        ],
      );

      const output = builder.produce({});

      expect(output).toBeTruthy();
      expect(output).toContain("Test Dashboard");
      expect(output).toContain("Microsoft.Portal/dashboards");
      expect(output).toContain("West Europe");
    });

    it("should generate dashboard with overrides", async () => {
      const specPath = "test/data/io_backend_light.yaml";
      const resolver = new OA3Resolver(specPath);
      const oa3Spec = await resolver.resolve();

      const builder = new AzDashboardRawBuilder(
        oa3Spec,
        "Test Dashboard",
        "app-gateway",
        "West Europe",
        "5m",
        10,
        20,
        1,
        [
          "/subscriptions/test/resourceGroups/test/providers/Microsoft.Network/applicationGateways/test",
        ],
      );

      const overrides = {
        endpoints: {
          "/api/v1/services/{service_id}": {
            availability_threshold: 0.95,
            response_time_threshold: 2,
          },
        },
        hosts: ["https://example.com"],
      };

      const output = builder.produce(overrides);

      expect(output).toBeTruthy();
      expect(output).toContain("Test Dashboard");
      expect(output).toContain("example.com");
    });

    it("should generate dashboard with base path overrides", async () => {
      const specPath = "test/data/io_backend_light.yaml";
      const resolver = new OA3Resolver(specPath);
      const oa3Spec = await resolver.resolve();

      const builder = new AzDashboardRawBuilder(
        oa3Spec,
        "Test Dashboard",
        "app-gateway",
        "West Europe",
        "5m",
        10,
        20,
        1,
        [
          "/subscriptions/test/resourceGroups/test/providers/Microsoft.Network/applicationGateways/test",
        ],
      );

      const overrides = {
        hosts: ["https://example.com/base"],
      };

      const output = builder.produce(overrides);

      expect(output).toBeTruthy();
      expect(output).toContain("Test Dashboard");
      expect(output).toContain("example.com");
    });

    it("should handle different resource types", async () => {
      const specPath = "test/data/io_backend_light.yaml";
      const resolver = new OA3Resolver(specPath);
      const oa3Spec = await resolver.resolve();

      const builder = new AzDashboardRawBuilder(
        oa3Spec,
        "API Management Dashboard",
        "api-management",
        "East US",
        "10m",
        15,
        30,
        2,
        [
          "/subscriptions/test/resourceGroups/test/providers/Microsoft.ApiManagement/service/test",
        ],
      );

      const output = builder.produce({});
      expect(output).toBeTruthy();
      expect(output).toContain("API Management Dashboard");
    });
  });
});

describe("Azure Dashboard Integration Tests - Terraform Builder", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "opex-test-"));
  });

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  describe("azure-dashboard terraform builder", () => {
    it("should generate terraform package", async () => {
      const specPath = "test/data/io_backend_light.yaml";
      const resolver = new OA3Resolver(specPath);
      const oa3Spec = await resolver.resolve();

      const rawBuilder = new AzDashboardRawBuilder(
        oa3Spec,
        "Terraform Test",
        "app-gateway",
        "West Europe",
        "5m",
        10,
        20,
        1,
        [
          "/subscriptions/test/resourceGroups/test/providers/Microsoft.Network/applicationGateways/test",
        ],
      );

      const builder = new AzDashboardBuilder(
        rawBuilder,
        "Terraform Test",
        "app-gateway",
        "West Europe",
        "5m",
        10,
        20,
        1,
        "/subscriptions/test/resourceGroups/test/providers/Microsoft.Network/applicationGateways/test",
        [
          "/subscriptions/test/resourceGroups/test/providers/microsoft.insights/actionGroups/test",
        ],
        undefined,
      );

      await builder.package(tempDir, {});

      const files = getAllFiles(tempDir);
      expect(files).toContain("opex.tf");
      expect(files).toContain("main.tf");
      expect(files).toContain("variables.tf");
      expect(files.some((f) => f.includes("env/dev/terraform.tfvars"))).toBe(
        false,
      );
      expect(files.some((f) => f.includes("env/uat/terraform.tfvars"))).toBe(
        false,
      );
      expect(files.some((f) => f.includes("env/prod/terraform.tfvars"))).toBe(
        false,
      );
    });
  });
});

describe("Azure Dashboard Integration Tests - Factory", () => {
  describe("builder factory", () => {
    it("should create azure-dashboard-raw builder", async () => {
      const resolver = new OA3Resolver("test/data/io_backend_light.yaml");

      const builder = await createBuilder("azure-dashboard-raw", {
        action_groups_ids: [],
        data_source_id: "/subscriptions/test/resourceGroups/test",
        evaluation_frequency: 10,
        evaluation_time_window: 20,
        event_occurrences: 1,
        location: "West Europe",
        name: "Factory Test",
        resolver,
        resource_type: "app-gateway",
        resources: ["/subscriptions/test/resourceGroups/test"],
        timespan: "5m",
      });

      expect(builder).toBeInstanceOf(AzDashboardRawBuilder);
    });

    it("should create azure-dashboard builder", async () => {
      const resolver = new OA3Resolver("test/data/io_backend_light.yaml");

      const builder = await createBuilder("azure-dashboard", {
        action_groups_ids: [
          "/subscriptions/test/resourceGroups/test/providers/microsoft.insights/actionGroups/test",
        ],
        data_source_id: "/subscriptions/test/resourceGroups/test",
        evaluation_frequency: 10,
        evaluation_time_window: 20,
        event_occurrences: 1,
        location: "West Europe",
        name: "Factory Test",
        resolver,
        resource_type: "app-gateway",
        resources: ["/subscriptions/test/resourceGroups/test"],
        timespan: "5m",
      });

      expect(builder).toBeInstanceOf(AzDashboardBuilder);
    });

    it("should throw error for invalid builder type", async () => {
      const resolver = new OA3Resolver("test/data/io_backend_light.yaml");

      await expect(
        createBuilder("invalid-type" as BuilderType, {
          action_groups_ids: [],
          data_source_id: "/subscriptions/test/resourceGroups/test",
          evaluation_frequency: 10,
          evaluation_time_window: 20,
          event_occurrences: 1,
          location: "West Europe",
          name: "Factory Test",
          resolver,
          resource_type: "app-gateway",
          resources: ["/subscriptions/test/resourceGroups/test"],
          timespan: "5m",
        }),
      ).rejects.toThrow();
    });
  });
});

describe("Azure Dashboard Integration Tests - Config", () => {
  describe("config loading", () => {
    it("should load valid config from examples", async () => {
      const config = await loadConfig("examples/azure_dashboard_config.yaml");

      expect(config.name).toBe("My spec");
      expect(config.location).toBe("West Europe");
      expect(config.resource_type).toBe("app-gateway");
      expect(config.action_groups).toHaveLength(2);
    });

    it("should load config with overrides", async () => {
      const config = await loadConfig(
        "examples/azure_dashboard_overrides_config.yaml",
      );

      expect(config.overrides).toBeDefined();
      expect(config.overrides?.hosts).toEqual(["https://example.com"]);
      expect(
        config.overrides?.endpoints?.["/api/v1/services/{service_id}"],
      ).toBeDefined();
    });

    it("should throw error for missing required fields", async () => {
      await expect(
        loadConfig("test/data/io_backend_invalid.yaml"),
      ).rejects.toThrow();
    });
  });
});

describe("Azure Dashboard Integration Tests - Resolver", () => {
  describe("OA3 resolver", () => {
    it("should resolve valid OpenAPI spec", async () => {
      const resolver = new OA3Resolver("test/data/io_backend_light.yaml");
      const spec = await resolver.resolve();

      expect(spec).toBeDefined();
      expect(spec.paths).toBeDefined();
      expect(typeof spec).toBe("object");
    });

    it("should handle malformed spec", async () => {
      const resolver = new OA3Resolver("test/data/io_backend_malformed.yaml");

      await expect(resolver.resolve()).rejects.toThrow();
    });

    it("should resolve spec with references", async () => {
      const resolver = new OA3Resolver("test/data/io_backend.yaml");
      const spec = await resolver.resolve();

      expect(spec).toBeDefined();
      expect(spec.paths).toBeDefined();
      const paths = spec.paths as Record<string, unknown>;
      expect(Object.keys(paths).length).toBeGreaterThan(0);
    });
  });
});

/**
 * Recursively get all files in a directory.
 */
function getAllFiles(dir: string, baseDir = dir): string[] {
  const files: string[] = [];

  for (const file of readdirSync(dir)) {
    const fullPath = join(dir, file);
    if (statSync(fullPath).isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else {
      files.push(fullPath.replace(baseDir + "/", ""));
    }
  }

  return files;
}
