import { describe, expect, it, vi } from "vitest";

import {
  createBedrockRuntimeClient,
  rerankingSupportedRegions,
} from "../aws.js";

describe("aws config", () => {
  it("should export rerankingSupportedRegions as array", () => {
    expect(Array.isArray(rerankingSupportedRegions)).toBe(true);
    expect(rerankingSupportedRegions.length).toBeGreaterThan(0);
  });

  it("should create a Bedrock runtime client", () => {
    const logger = {
      error: vi.fn(),
    } as any;
    const client = createBedrockRuntimeClient("eu-central-1", logger);
    expect(client).toHaveProperty("send");
  });
});
