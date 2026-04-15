/**
 * Tests for the createOctokit log suppression behavior in shared.ts.
 * Verifies that GET /releases/tags/<tag> - 404 messages are suppressed
 * while other error logs are not affected.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createOctokit } from "../shared.js";

const ORIGINAL_GITHUB_TOKEN = process.env.GITHUB_TOKEN;

beforeEach(() => {
  process.env.GITHUB_TOKEN = "test-token";
});

afterEach(() => {
  process.env.GITHUB_TOKEN = ORIGINAL_GITHUB_TOKEN;
  vi.restoreAllMocks();
});

describe("createOctokit with suppressReleaseTag404Logs: true", () => {
  it("suppresses GET /releases/tags/<tag> - 404 error log", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const octokit = createOctokit({ suppressReleaseTag404Logs: true });

    // Simulate Octokit calling its internal log.error with the noisy 404 line
    const octokitLog = (
      octokit as unknown as { log: { error: (...args: unknown[]) => void } }
    ).log;
    octokitLog.error(
      "GET /repos/pagopa/dx/releases/tags/%40pagopa%2Fazure-tracing%400.4.17 - 404 with id ABCD in 183ms",
    );

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("does not suppress a non-release-tag 404 error log", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const octokit = createOctokit({ suppressReleaseTag404Logs: true });

    const octokitLog = (
      octokit as unknown as { log: { error: (...args: unknown[]) => void } }
    ).log;
    octokitLog.error(
      "GET /repos/pagopa/dx/git/refs/tags - 404 with id XYZ in 50ms",
    );

    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it("does not suppress a non-404 response for releases/tags endpoint", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const octokit = createOctokit({ suppressReleaseTag404Logs: true });

    const octokitLog = (
      octokit as unknown as { log: { error: (...args: unknown[]) => void } }
    ).log;
    octokitLog.error(
      "GET /repos/pagopa/dx/releases/tags/%40pagopa%2Fazure-tracing%400.4.17 - 500 with id ABCD in 50ms",
    );

    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it("does not suppress a non-GET method on releases/tags - 404", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const octokit = createOctokit({ suppressReleaseTag404Logs: true });

    const octokitLog = (
      octokit as unknown as { log: { error: (...args: unknown[]) => void } }
    ).log;
    octokitLog.error(
      "POST /repos/pagopa/dx/releases/tags/something - 404 with id ABCD in 50ms",
    );

    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it("passes through warn logs unchanged", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const octokit = createOctokit({ suppressReleaseTag404Logs: true });

    const octokitLog = (
      octokit as unknown as { log: { warn: (...args: unknown[]) => void } }
    ).log;
    octokitLog.warn("some warning message");

    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it("silences info logs", () => {
    const infoSpy = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const octokit = createOctokit({ suppressReleaseTag404Logs: true });

    const octokitLog = (
      octokit as unknown as { log: { info: (...args: unknown[]) => void } }
    ).log;
    octokitLog.info("POST /repos/pagopa/dx/releases - 201 in 250ms");

    expect(infoSpy).not.toHaveBeenCalled();
  });
});

describe("createOctokit without suppressReleaseTag404Logs", () => {
  it("returns a standard Octokit instance when option is not set", () => {
    const octokit = createOctokit();
    // Default Octokit has a log property but does not suppress anything
    expect(octokit).toBeDefined();
  });
});
