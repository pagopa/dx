import { Octokit } from "@octokit/rest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "../../utils/logger.js";
import * as githubAuth from "../github.js";

vi.mock("@octokit/rest");

describe("verifyGithubUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REQUIRED_ORGANIZATIONS = "pagopa";
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
    const errorLog = vi.spyOn(logger, "error");
    const result = await githubAuth.verifyGithubUser("token");
    expect(result).toBe(false);
    expect(errorLog).toHaveBeenCalledWith(
      expect.any(Error),
      "Error verifying GitHub organization membership:",
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
  });
});
