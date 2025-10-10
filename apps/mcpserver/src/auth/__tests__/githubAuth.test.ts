import { describe, expect, it, vi } from "vitest";
vi.mock("../../utils/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));
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
    const result = await githubAuth.verifyGithubUser("token");
    expect(result).toBe(false);
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
