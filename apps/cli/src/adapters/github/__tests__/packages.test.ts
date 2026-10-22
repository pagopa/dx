/**
 * Verifies the GitHub Packages pre-flight probe used by `dx init`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getGitHubPAT: vi.fn(),
}));

vi.mock("../../octokit/index.js", () => ({
  getGitHubPAT: mocks.getGitHubPAT,
}));

import {
  assertGitHubPackagesAccess,
  GITHUB_PACKAGES_PROBE_PACKAGE,
  GITHUB_PACKAGES_REGISTRY,
} from "../packages.js";

const fetchMock = vi.fn();

const responseWithStatus = (status: number): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
  }) as Response;

const captureError = async (promise: Promise<void>): Promise<Error> =>
  promise.then(
    () => {
      throw new Error("Expected the probe to reject");
    },
    (cause: unknown) => cause as Error,
  );

describe("assertGitHubPackagesAccess", () => {
  beforeEach(() => {
    mocks.getGitHubPAT.mockReset();
    mocks.getGitHubPAT.mockResolvedValue("test-token");
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("probes the DX package on GitHub Packages with the resolved token", async () => {
    fetchMock.mockResolvedValue(responseWithStatus(200));

    await expect(assertGitHubPackagesAccess()).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      `${GITHUB_PACKAGES_REGISTRY}/${encodeURIComponent(GITHUB_PACKAGES_PROBE_PACKAGE)}`,
      {
        headers: {
          accept: "application/json",
          authorization: "Bearer test-token",
        },
      },
    );
  });

  it.each([401, 403])(
    "explains the missing read:packages scope on HTTP %i",
    async (status) => {
      fetchMock.mockResolvedValue(responseWithStatus(status));

      const error = await captureError(assertGitHubPackagesAccess());

      expect(error.message).toContain(
        "the registry requires the read:packages scope",
      );
      expect(error.message).toContain("gh auth refresh --scopes read:packages");
      expect(error.message).toContain(`HTTP ${status}`);
    },
  );

  it("fails with login guidance when no token is available", async () => {
    mocks.getGitHubPAT.mockResolvedValue(undefined);

    const error = await captureError(assertGitHubPackagesAccess());

    expect(error.message).toContain("gh auth login");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports unexpected registry responses", async () => {
    fetchMock.mockResolvedValue(responseWithStatus(500));

    const error = await captureError(assertGitHubPackagesAccess());

    expect(error.message).toContain("Unexpected response from GitHub Packages");
    expect(error.message).toContain("HTTP 500");
  });

  it("preserves the cause when the registry cannot be reached", async () => {
    const networkError = new TypeError("fetch failed");
    fetchMock.mockRejectedValue(networkError);

    const error = await captureError(assertGitHubPackagesAccess());

    expect(error.message).toContain("Failed to reach GitHub Packages");
    expect(error.cause).toBe(networkError);
  });
});
