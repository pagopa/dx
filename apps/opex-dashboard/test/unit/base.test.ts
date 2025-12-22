/**
 * Unit tests for base builder class.
 */

import { describe, expect, it } from "vitest";

import type { TemplateContext } from "@/core/template/context.schema.js";

import { Builder } from "@/builders/base.js";

class TestBuilder extends Builder<TemplateContext> {}

describe("Builder", () => {
  const mockTemplateFn = (context: TemplateContext) => JSON.stringify(context);
  const baseProperties: TemplateContext = {
    actionGroupsIds: ["ag1"],
    dataSourceId: "ds1",
    endpoints: {},
    hosts: ["host1"],
    location: "eastus",
    name: "test",
    resourceType: "app-gateway",
  };

  it("should initialize with template function and base properties", () => {
    const builder = new TestBuilder(mockTemplateFn, baseProperties);

    expect(builder.props()).toEqual(baseProperties);
  });

  it("should produce output by merging properties and calling template function", () => {
    const builder = new TestBuilder(mockTemplateFn, baseProperties);
    const overrides = { name: "overridden" };
    const result = builder.produce(overrides);

    const expectedContext = { ...baseProperties, ...overrides };
    expect(result).toBe(JSON.stringify(expectedContext));
  });

  it("should produce output with no overrides", () => {
    const builder = new TestBuilder(mockTemplateFn, baseProperties);
    const result = builder.produce();

    expect(result).toBe(JSON.stringify(baseProperties));
  });

  it("should throw error when packaging is called on base class", () => {
    const builder = new TestBuilder(mockTemplateFn, baseProperties);

    expect(() => builder.package("/tmp/output")).toThrow(
      "Packaging not supported for TestBuilder. Only azure-dashboard template type supports packaging.",
    );
  });
});
