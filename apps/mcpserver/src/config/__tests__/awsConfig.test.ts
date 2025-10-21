import { describe, expect, it, vi } from "vitest";
vi.mock("../logging", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));
import * as awsConfig from "../aws.js";

describe("aws config", () => {
  it("should export kbRerankingEnabled as boolean", () => {
    expect(typeof awsConfig.kbRerankingEnabled).toBe("boolean");
  });

  it("should export knowledgeBaseId as string", () => {
    expect(typeof awsConfig.knowledgeBaseId).toBe("string");
  });

  it("should export region as string", () => {
    expect(typeof awsConfig.region).toBe("string");
  });

  it("should export kbRuntimeClient as object", () => {
    expect(typeof awsConfig.kbRuntimeClient).toBe("object");
    expect(awsConfig.kbRuntimeClient).toHaveProperty("send");
  });
});
