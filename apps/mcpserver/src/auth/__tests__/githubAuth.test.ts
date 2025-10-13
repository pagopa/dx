import { describe, expect, it, vi } from "vitest";

import { logger } from "../../utils/logger.js";
import * as githubAuth from "../github.js";

describe("verifyGithubUser", () => {
  it("returns false if no token is provided", async () => {
    const result = await githubAuth.verifyGithubUser("");
    expect(result).toBe(false);
  });

  it("returns false if axios throws", async () => {
    vi.mock("axios", () => ({
      default: { get: vi.fn().mockRejectedValue(new Error("fail")) },
    }));
    const errorLog = vi.spyOn(logger, "error");
    const result = await githubAuth.verifyGithubUser("token");
    expect(result).toBe(false);
    expect(errorLog).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Error),
    );
  });

  it("returns false if user is not member of required org", async () => {
    vi.mock("axios", () => ({
      default: {
        get: vi.fn().mockResolvedValue({ data: [{ login: "otherorg" }] }),
      },
    }));
    const result = await githubAuth.verifyGithubUser("token");
    expect(result).toBe(false);
  });
});
