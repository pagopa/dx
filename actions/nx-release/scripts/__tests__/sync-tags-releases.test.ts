/**
 * Verifies the release lookup used by nx-release stays quiet for expected
 * GitHub 404 responses while probing for missing releases by tag.
 */
import { Octokit } from "@octokit/rest";
import { describe, expect, it, vi } from "vitest";

import { releaseExists } from "../sync-tags-releases.js";

describe("releaseExists", () => {
  it("does print other errors emitted by Octokit", async () => {
    const owner = "pagopa";
    const repo = "dx";
    const tag = "@pagopa/azure-tracing@0.4.17";

    const octokit = new Octokit();

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    vi.spyOn(octokit.repos, "getReleaseByTag").mockImplementation(
      async (options) => {
        options?.request?.log?.error?.(
          "GET /repos/pagopa/dx/releases/tags/%40pagopa%2Fazure-tracing%400.4.17 - 500 with id F3C0:E6932:1C23C:71622:69CD2BF3 in 183ms",
        );

        throw Object.assign(new Error("Internal Server Error"), {
          status: 500,
        });
      },
    );

    await expect(releaseExists(octokit, owner, repo, tag)).resolves.toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "GET /repos/pagopa/dx/releases/tags/%40pagopa%2Fazure-tracing%400.4.17 - 500",
      ),
    );
  });

  it("does not print the noisy 404 emitted when a release tag is missing", async () => {
    const owner = "pagopa";
    const repo = "dx";
    const tag = "@pagopa/azure-tracing@0.4.17";

    const octokit = new Octokit();

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    vi.spyOn(octokit.repos, "getReleaseByTag").mockImplementation(
      async (options) => {
        options?.request?.log?.error?.(
          "GET /repos/pagopa/dx/releases/tags/%40pagopa%2Fazure-tracing%400.4.17 - 404 with id F3C0:E6932:1C23C:71622:69CD2BF3 in 183ms",
        );

        throw Object.assign(new Error("Not Found"), { status: 404 });
      },
    );

    await expect(releaseExists(octokit, owner, repo, tag)).resolves.toBe(false);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});
