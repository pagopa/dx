/**
 * Tests for confirmGitHubRepoCreation in the init command.
 */

import inquirer from "inquirer";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Payload as MonorepoPayload } from "../../../plop/generators/monorepo/index.js";

import { confirmGitHubRepoCreation } from "../init.js";

vi.mock("inquirer");

const makePayload = (
  overrides: Partial<MonorepoPayload> = {},
): MonorepoPayload => ({
  repoDescription: "A test repo",
  repoName: "test-repo",
  repoOwner: "pagopa",
  ...overrides,
});

describe("confirmGitHubRepoCreation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when the user confirms", async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: true });

    const result = await confirmGitHubRepoCreation(makePayload());

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(true);
  });

  it("returns false when the user declines", async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: false });

    const result = await confirmGitHubRepoCreation(makePayload());

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(false);
  });

  it("prompts with the correct repository name and owner", async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: true });

    const payload = makePayload({ repoName: "my-repo", repoOwner: "my-org" });
    await confirmGitHubRepoCreation(payload);

    expect(inquirer.prompt).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("my-org/my-repo"),
        type: "confirm",
      }),
    );
  });

  it("returns an error result when the prompt rejects", async () => {
    const cause = new Error("non-interactive TTY");
    vi.mocked(inquirer.prompt).mockRejectedValue(cause);

    const result = await confirmGitHubRepoCreation(makePayload());

    expect(result.isErr()).toBe(true);
    const err = result._unsafeUnwrapErr();
    expect(err).toBeInstanceOf(Error);
    expect(err.cause).toBe(cause);
  });
});
