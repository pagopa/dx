import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSsmClient, getSecureParameter } from "../ssm.js";

vi.mock("@aws-sdk/client-ssm");

describe("getSecureParameter", () => {
  const mockSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(SSMClient).mockImplementation((...args: unknown[]) => {
      const config = args[0] as undefined | { region?: string };
      return {
        config: { region: config?.region },
        send: mockSend,
      } as unknown as SSMClient;
    });
  });

  it("should retrieve a secure parameter successfully", async () => {
    const parameterName = "/github/client-secret";
    const expectedValue = "test-secret-value";

    mockSend.mockResolvedValueOnce({
      Parameter: {
        Value: expectedValue,
      },
    });

    const client = createSsmClient();
    const fetchParameter = getSecureParameter(client);

    const result = await fetchParameter(parameterName);

    expect(result).toBe(expectedValue);
    expect(SSMClient).toHaveBeenCalledWith({
      region: "eu-central-1",
    });
    expect(mockSend).toHaveBeenCalledWith(expect.any(GetParameterCommand));
  });

  it("should use custom region when provided", async () => {
    const parameterName = "/github/client-secret";
    const customRegion = "us-east-1";

    mockSend.mockResolvedValueOnce({
      Parameter: {
        Value: "test-value",
      },
    });

    const client = createSsmClient(customRegion);
    const fetchParameter = getSecureParameter(client);

    await fetchParameter(parameterName);

    expect(SSMClient).toHaveBeenCalledWith({
      region: customRegion,
    });
  });

  it("should use AWS_REGION environment variable when no region is provided", async () => {
    const parameterName = "/github/client-secret";
    const originalRegion = process.env.AWS_REGION;
    process.env.AWS_REGION = "ap-southeast-1";

    mockSend.mockResolvedValueOnce({
      Parameter: {
        Value: "test-value",
      },
    });

    const client = createSsmClient();
    const fetchParameter = getSecureParameter(client);

    await fetchParameter(parameterName);

    expect(SSMClient).toHaveBeenCalledWith({
      region: "ap-southeast-1",
    });

    // Restore original value
    if (originalRegion !== undefined) {
      process.env.AWS_REGION = originalRegion;
    } else {
      delete process.env.AWS_REGION;
    }
  });

  it("should throw error when parameter is not found", async () => {
    const parameterName = "/github/client-secret";

    mockSend.mockResolvedValueOnce({
      Parameter: undefined,
    });

    const client = createSsmClient();
    const fetchParameter = getSecureParameter(client);

    await expect(fetchParameter(parameterName)).rejects.toThrow(
      `Parameter ${parameterName} not found or has no value`,
    );
  });

  it("should throw error when parameter has no value", async () => {
    const parameterName = "/github/client-secret";

    mockSend.mockResolvedValueOnce({
      Parameter: {
        Value: undefined,
      },
    });

    const client = createSsmClient();
    const fetchParameter = getSecureParameter(client);

    await expect(fetchParameter(parameterName)).rejects.toThrow(
      `Parameter ${parameterName} not found or has no value`,
    );
  });

  it("should propagate SSM client errors", async () => {
    const parameterName = "/github/client-secret";
    const error = new Error("AccessDeniedException");

    mockSend.mockRejectedValueOnce(error);

    const client = createSsmClient();
    const fetchParameter = getSecureParameter(client);

    await expect(fetchParameter(parameterName)).rejects.toThrow(
      "AccessDeniedException",
    );
  });
});
