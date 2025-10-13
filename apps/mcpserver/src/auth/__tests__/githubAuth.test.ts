import { describe, expect, it, vi } from "vitest";

import { logger } from "../../utils/logger.js";
import * as githubAuth from "../github.js";

describe("verifyGithubUser", () => {
  it("returns false if no token is provided", async () => {
    const result = await githubAuth.verifyGithubUser("");
    expect(result).toBe(false);
  });

  it("returns false if Octokit throws", async () => {
    vi.mock("@octokit/rest", () => ({
      Octokit: vi.fn().mockImplementation(() => ({
        rest: {
          orgs: {
            listForAuthenticatedUser: vi
              .fn()
              .mockRejectedValue(new Error("fail")),
          },
        },
      })),
    }));
    const errorLog = vi.spyOn(logger, "error");
    const result = await githubAuth.verifyGithubUser("token");
    expect(result).toBe(false);
    expect(errorLog).toHaveBeenCalledWith(
      expect.any(Error),
      "Error verifying GitHub organization membership:",
    );
  });

  it("returns false if user is not member of required org", async () => {
    vi.mock("@octokit/rest", () => ({
      Octokit: vi.fn().mockImplementation(() => ({
        rest: {
          orgs: {
            listForAuthenticatedUser: vi.fn().mockResolvedValue({
              data: [{ login: "otherorg" }],
            }),
          },
        },
      })),
    }));
    const result = await githubAuth.verifyGithubUser("token");
    expect(result).toBe(false);
  });

  it("returns true if user is member of required org", async () => {
    vi.mock("@octokit/rest", () => ({
      Octokit: vi.fn().mockImplementation(() => ({
        rest: {
          orgs: {
            listForAuthenticatedUser: vi.fn().mockResolvedValue({
              data: [{ login: "pagopa" }],
            }),
          },
        },
      })),
    }));
    const result = await githubAuth.verifyGithubUser("token");
    expect(result).toBe(true);
  });
});
