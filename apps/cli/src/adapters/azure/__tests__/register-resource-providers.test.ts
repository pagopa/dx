import { describe, expect, it, vi } from "vitest";

import {
  areResourceProvidersRegistered,
  registerResourceProviders,
  REQUIRED_RESOURCE_PROVIDERS,
} from "../register-resource-providers.js";

const mockRegister = vi.fn().mockResolvedValue({});
const mockGet = vi.fn().mockResolvedValue({ registrationState: "Registered" });

vi.mock("@azure/arm-resources", () => ({
  ResourceManagementClient: vi.fn().mockImplementation(() => ({
    providers: { get: mockGet, register: mockRegister },
  })),
}));

vi.mock("@logtape/logtape", () => ({
  getLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
  }),
}));

const stubCredential = {
  getToken: vi.fn().mockResolvedValue({ expiresOnTimestamp: 0, token: "stub" }),
};

describe("registerResourceProviders", () => {
  it("should register all required providers", async () => {
    await registerResourceProviders(stubCredential, "sub-123");

    expect(mockRegister).toHaveBeenCalledTimes(
      REQUIRED_RESOURCE_PROVIDERS.length,
    );
    for (const namespace of REQUIRED_RESOURCE_PROVIDERS) {
      expect(mockRegister).toHaveBeenCalledWith(namespace);
    }
  });

  it("should include exactly 16 providers", () => {
    expect(REQUIRED_RESOURCE_PROVIDERS).toHaveLength(16);
  });

  it("should register providers in parallel", async () => {
    const callOrder: string[] = [];

    mockRegister.mockImplementation(async (namespace: string) => {
      callOrder.push(`start:${namespace}`);
      await new Promise((resolve) => setTimeout(resolve, 10));
      callOrder.push(`end:${namespace}`);
    });

    await registerResourceProviders(stubCredential, "sub-123");

    // All starts should come before any end in a parallel execution
    const firstEnd = callOrder.findIndex((e) => e.startsWith("end:"));
    const allStarts = callOrder.filter((e) => e.startsWith("start:"));
    expect(allStarts.length).toBe(REQUIRED_RESOURCE_PROVIDERS.length);
    // In parallel execution, all starts happen before the first end
    expect(firstEnd).toBeGreaterThanOrEqual(REQUIRED_RESOURCE_PROVIDERS.length);
  });

  it("should propagate errors from provider registration", async () => {
    const registrationError = new Error("Registration failed");
    mockRegister.mockRejectedValueOnce(registrationError);

    await expect(
      registerResourceProviders(stubCredential, "sub-456"),
    ).rejects.toThrow("Registration failed");
  });

  it("should not fail when provider is already registered", async () => {
    // providers.register() is idempotent — returns success for already-registered providers
    mockRegister.mockResolvedValue({
      registrationState: "Registered",
    });

    await expect(
      registerResourceProviders(stubCredential, "sub-789"),
    ).resolves.toBeUndefined();
  });
});

describe("areResourceProvidersRegistered", () => {
  it("should return true when all providers are registered", async () => {
    mockGet.mockResolvedValue({ registrationState: "Registered" });

    const result = await areResourceProvidersRegistered(
      stubCredential,
      "sub-123",
    );

    expect(result).toBe(true);
    expect(mockGet).toHaveBeenCalledTimes(REQUIRED_RESOURCE_PROVIDERS.length);
  });

  it("should return false when any provider is not registered", async () => {
    mockGet
      .mockResolvedValue({ registrationState: "Registered" })
      .mockResolvedValueOnce({ registrationState: "NotRegistered" });

    const result = await areResourceProvidersRegistered(
      stubCredential,
      "sub-456",
    );

    expect(result).toBe(false);
  });

  it("should check all required providers", async () => {
    mockGet.mockResolvedValue({ registrationState: "Registered" });

    await areResourceProvidersRegistered(stubCredential, "sub-789");

    for (const namespace of REQUIRED_RESOURCE_PROVIDERS) {
      expect(mockGet).toHaveBeenCalledWith(namespace);
    }
  });
});
