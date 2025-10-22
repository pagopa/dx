import { getLogger } from "@logtape/logtape";
import { Octokit } from "@octokit/rest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as githubAuth from "../github.js";

vi.mock("@octokit/rest");

describe("verifyGithubUser", () => {
  let loggerSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REQUIRED_ORGANIZATIONS = "pagopa";

    // Get logger and spy on its methods - no need for special configuration
    const logger = getLogger(["mcpserver", "github-auth"]);

    loggerSpy = {
      debug: vi.spyOn(logger, "debug"),
      error: vi.spyOn(logger, "error"),
      warn: vi.spyOn(logger, "warn"),
    };
  });

  it("returns false if no token is provided", async () => {
    const result = await githubAuth.verifyGithubUser("");
    expect(result).toBe(false);
  });

  it("returns false if Octokit throws", async () => {
    vi.mocked(Octokit).mockImplementation(
      () =>
        ({
          rest: {
            orgs: {
              listForAuthenticatedUser: vi
                .fn()
                .mockRejectedValue(new Error("fail")),
            },
          },
        }) as unknown as InstanceType<typeof Octokit>,
    );
    const result = await githubAuth.verifyGithubUser("token");
    expect(result).toBe(false);
    expect(loggerSpy.error).toHaveBeenCalledWith(
      "Error verifying GitHub organization membership",
      { error: expect.any(Error) },
    );
  });

  it("returns false if user is not member of required org", async () => {
    vi.mocked(Octokit).mockImplementation(
      () =>
        ({
          rest: {
            orgs: {
              listForAuthenticatedUser: vi.fn().mockResolvedValue({
                data: [{ login: "otherorg" }],
              }),
            },
          },
        }) as unknown as InstanceType<typeof Octokit>,
    );
    const result = await githubAuth.verifyGithubUser("token");
    expect(result).toBe(false);
    expect(loggerSpy.warn).toHaveBeenCalledWith(
      "User is not a member of any of the required organizations: pagopa",
    );
  });

  it("returns true if user is member of required org", async () => {
    vi.mocked(Octokit).mockImplementation(
      () =>
        ({
          rest: {
            orgs: {
              listForAuthenticatedUser: vi.fn().mockResolvedValue({
                data: [{ login: "pagopa" }],
              }),
            },
          },
        }) as unknown as InstanceType<typeof Octokit>,
    );
    const result = await githubAuth.verifyGithubUser("token");
    expect(result).toBe(true);
    expect(loggerSpy.debug).toHaveBeenCalledWith(
      "User is a member of one of the required organizations: pagopa",
    );
  });
});
