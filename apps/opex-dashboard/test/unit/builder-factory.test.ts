/**
 * Unit tests for builder factory.
 */

import { describe, expect, it, vi } from "vitest";

import { type BuilderType, createBuilder } from "@/core/builder-factory.js";
import { InvalidBuilderError } from "@/core/errors/index.js";
import { OA3Resolver } from "@/core/resolver/index.js";

describe("createBuilder", () => {
  const baseParams = {
    actionGroupsIds: ["ag1"],
    dataSourceId: "ds1",
    evaluationFrequency: 10,
    evaluationTimeWindow: 20,
    eventOccurrences: 1,
    location: "eastus",
    name: "test",
    resolver: {} as OA3Resolver, // mock
    resources: ["res1"],
    resourceType: "app-gateway",
    timespan: "5m",
  };

  it("should throw InvalidBuilderError for unknown template type", async () => {
    await expect(
      createBuilder("unknown" as unknown as BuilderType, baseParams),
    ).rejects.toThrow(InvalidBuilderError);
  });

  it("should create azure-dashboard-raw builder", async () => {
    const mockSpec = { paths: {} };
    const mockResolver = {
      resolve: vi.fn().mockResolvedValue(mockSpec),
    } as unknown as OA3Resolver;

    const params = { ...baseParams, resolver: mockResolver };

    const builder = await createBuilder("azure-dashboard-raw", params);

    expect(builder).toBeDefined();
    expect(mockResolver.resolve).toHaveBeenCalled();
  });

  it("should create azure-dashboard builder", async () => {
    const mockSpec = { paths: {} };
    const mockResolver = {
      resolve: vi.fn().mockResolvedValue(mockSpec),
    } as unknown as OA3Resolver;

    const params = { ...baseParams, resolver: mockResolver };

    const builder = await createBuilder("azure-dashboard", params);

    expect(builder).toBeDefined();
    expect(mockResolver.resolve).toHaveBeenCalled();
  });

  it("should throw InvalidBuilderError when resolver fails", async () => {
    const mockResolver = {
      resolve: vi.fn().mockRejectedValue(new Error("Resolve failed")),
    } as unknown as OA3Resolver;

    const params = { ...baseParams, resolver: mockResolver };

    await expect(createBuilder("azure-dashboard", params)).rejects.toThrow(
      InvalidBuilderError,
    );
  });
});
