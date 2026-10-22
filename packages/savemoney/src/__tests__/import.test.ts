import { describe, expect, it, vi } from "vitest";

const loggerMocks = vi.hoisted(() => ({
  configure: vi.fn(),
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  })),
}));

vi.mock("@logtape/logtape", () => loggerMocks);

describe("package entrypoint", () => {
  it("does not configure global logging when imported", async () => {
    const packageApi = await import("../index.js");

    expect(packageApi.azure.analyzeAzureResources).toBeTypeOf("function");
    expect(loggerMocks.configure).not.toHaveBeenCalled();
  });
});
