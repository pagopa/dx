/**
 * Unit tests for configuration loading and validation.
 */

import { describe, expect, it } from "vitest";

import { ConfigSchema } from "@/core/config/config.schema.js";
import { DEFAULTS } from "@/core/config/defaults.js";

describe("Config Schema", () => {
  it("should validate minimal valid config", () => {
    const config = {
      action_groups: ["/subscriptions/test/actionGroups/test"],
      data_source: "/subscriptions/test/dataSource",
      location: "West Europe",
      name: "Test Dashboard",
      oa3_spec: "test/data/io_backend_light.yaml",
      resource_type: "app-gateway",
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("should apply default values", () => {
    const config = {
      action_groups: ["/subscriptions/test/actionGroups/test"],
      data_source: "/subscriptions/test/dataSource",
      location: "West Europe",
      name: "Test Dashboard",
      oa3_spec: "test/data/io_backend_light.yaml",
      resource_type: "app-gateway",
    };

    const result = ConfigSchema.parse(config);
    expect(result.timespan).toBe(DEFAULTS.timespan);
    expect(result.evaluation_frequency).toBe(DEFAULTS.evaluation_frequency);
    expect(result.evaluation_time_window).toBe(DEFAULTS.evaluation_time_window);
    expect(result.event_occurrences).toBe(DEFAULTS.event_occurrences);
  });

  it("should validate resource type", () => {
    const config = {
      action_groups: ["/subscriptions/test/actionGroups/test"],
      data_source: "/subscriptions/test/dataSource",
      location: "West Europe",
      name: "Test Dashboard",
      oa3_spec: "test/data/io_backend_light.yaml",
      resource_type: "invalid-type",
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("should validate overrides structure", () => {
    const config = {
      action_groups: ["/subscriptions/test/actionGroups/test"],
      data_source: "/subscriptions/test/dataSource",
      location: "West Europe",
      name: "Test Dashboard",
      oa3_spec: "test/data/io_backend_light.yaml",
      overrides: {
        endpoints: {
          "/api/endpoint": {
            availability_threshold: 0.95,
            response_time_threshold: 2,
          },
        },
        hosts: ["https://example.com"],
      },
      resource_type: "app-gateway",
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("should accept valid threshold values", () => {
    const config = {
      action_groups: ["/subscriptions/test/actionGroups/test"],
      data_source: "/subscriptions/test/dataSource",
      location: "West Europe",
      name: "Test Dashboard",
      oa3_spec: "test/data/io_backend_light.yaml",
      overrides: {
        endpoints: {
          "/api/endpoint": {
            availability_threshold: 0.95,
          },
        },
      },
      resource_type: "app-gateway",
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("should validate terraform configuration", () => {
    const config = {
      action_groups: ["/subscriptions/test/actionGroups/test"],
      data_source: "/subscriptions/test/dataSource",
      location: "West Europe",
      name: "Test Dashboard",
      oa3_spec: "test/data/io_backend_light.yaml",
      resource_type: "app-gateway",
      terraform: {
        environments: {
          dev: {
            env_short: "d",
            prefix: "io",
          },
        },
      },
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("should reject invalid env_short values", () => {
    const config = {
      action_groups: ["/subscriptions/test/actionGroups/test"],
      data_source: "/subscriptions/test/dataSource",
      location: "West Europe",
      name: "Test Dashboard",
      oa3_spec: "test/data/io_backend_light.yaml",
      resource_type: "app-gateway",
      terraform: {
        environments: {
          dev: {
            env_short: "invalid",
            prefix: "io",
          },
        },
      },
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("should reject prefix longer than 6 characters", () => {
    const config = {
      action_groups: ["/subscriptions/test/actionGroups/test"],
      data_source: "/subscriptions/test/dataSource",
      location: "West Europe",
      name: "Test Dashboard",
      oa3_spec: "test/data/io_backend_light.yaml",
      resource_type: "app-gateway",
      terraform: {
        environments: {
          dev: {
            env_short: "d",
            prefix: "toolong",
          },
        },
      },
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});

describe("Config Defaults", () => {
  it("should have correct default values", () => {
    expect(DEFAULTS.timespan).toBe("5m");
    expect(DEFAULTS.evaluation_frequency).toBe(10);
    expect(DEFAULTS.evaluation_time_window).toBe(20);
    expect(DEFAULTS.event_occurrences).toBe(1);
    expect(DEFAULTS.availability_threshold).toBe(0.99);
    expect(DEFAULTS.response_time_threshold).toBe(1);
  });
});
