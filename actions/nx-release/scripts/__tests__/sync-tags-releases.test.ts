/**
 * Verifies the release lookup used by nx-release stays quiet for expected
 * GitHub 404 responses while probing for missing releases by tag.
 */
import { Octokit } from "@octokit/rest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { isAlreadyExistsError, releaseExists } from "../sync-tags-releases.js";

describe("isAlreadyExistsError", () => {
  it("recognizes GitHub's already_exists validation error", () => {
    const err = {
      response: {
        data: {
          errors: [{ code: "already_exists", field: "tag_name" }],
        },
      },
      status: 422,
    };

    expect(isAlreadyExistsError(err)).toBe(true);
  });

  it("does not treat other validation errors as already existing", () => {
    const err = {
      response: { data: { errors: [{ code: "missing_field" }] } },
      status: 422,
    };

    expect(isAlreadyExistsError(err)).toBe(false);
  });

  it("does not treat non-validation errors as already existing", () => {
    expect(isAlreadyExistsError({ status: 500 })).toBe(false);
    expect(isAlreadyExistsError(new Error("network down"))).toBe(false);
  });
});

describe("releaseExists", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
