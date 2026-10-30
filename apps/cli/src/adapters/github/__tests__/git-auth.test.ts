/**
 * Verifies Git credential selection, workflow-scope checks, and safe diagnostics.
 */
import { inspect } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type GitResult = {
  exitCode: number;
  stderr: string;
  stdout: string;
};

const mocks = vi.hoisted(() => {
  const git =
    vi.fn<
      (
        strings: TemplateStringsArray,
        ...values: readonly unknown[]
      ) => Promise<GitResult>
    >();

  return {
    execa$: vi.fn<(options: unknown) => typeof git>(() => git),
    fetch: vi.fn<typeof fetch>(),
    git,
    info: vi.fn(),
    warn: vi.fn(),
  };
});

vi.mock("execa", () => ({ $: mocks.execa$ }));
vi.mock("@logtape/logtape", () => ({
  getLogger: () => ({ info: mocks.info, warn: mocks.warn }),
}));

import { assertGitHubWorkflowAccess } from "../git-auth.js";

describe("assertGitHubWorkflowAccess", () => {
  const token = "git-credential-test-token";
  let pushUrl: string;
  let credentialResult: GitResult;
  let extraHeaders: GitResult;

  beforeEach(() => {
    vi.clearAllMocks();
    pushUrl = "https://github.com/pagopa/test-repo.git";
    credentialResult = {
      exitCode: 0,
      stderr: "",
      stdout: `username=test-user\npassword=${token}\n`,
    };
    extraHeaders = { exitCode: 1, stderr: "", stdout: "" };
    mocks.git.mockReset();
    mocks.git.mockImplementation(async (strings, ...values) => {
      const command = strings.reduce(
        (full, part, index) => full + part + String(values[index] ?? ""),
        "",
      );
      if (command === "git remote get-url --push origin") {
        return { exitCode: 0, stderr: "", stdout: pushUrl };
      }
      if (command.startsWith("git config --get-urlmatch http.extraHeader ")) {
        return extraHeaders;
      }
      if (command === "git credential fill") {
        return credentialResult;
      }
      throw new Error("Unexpected Git command");
    });
    mocks.fetch.mockReset();
    mocks.fetch.mockResolvedValue(
      new Response(null, {
        headers: { "X-OAuth-Scopes": "repo, workflow, read:packages" },
      }),
    );
    vi.stubGlobal("fetch", mocks.fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("verifies the effective push URL's Git credential, not another CLI token", async () => {
    await expect(assertGitHubWorkflowAccess()).resolves.toBeUndefined();

    expect(mocks.execa$).toHaveBeenCalledWith(
      expect.objectContaining({
        env: expect.objectContaining({ GIT_TERMINAL_PROMPT: "0" }),
        input: `url=${pushUrl}\n\n`,
        shell: false,
      }),
    );
    expect(mocks.fetch).toHaveBeenCalledWith(
      "https://api.github.com/user",
      expect.objectContaining({
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${token}`,
        },
        redirect: "error",
      }),
    );
    expect(mocks.warn).not.toHaveBeenCalled();
  });

  it.each(["repo, read:packages", ""])(
    "rejects an OAuth credential without workflow scope (%j) with recovery instructions",
    async (scopes) => {
      mocks.fetch.mockResolvedValue(
        new Response(null, { headers: { "X-OAuth-Scopes": scopes } }),
      );

      await expect(assertGitHubWorkflowAccess()).rejects.toThrow(
        "gh auth setup-git --hostname github.com",
      );
      expect(mocks.warn).not.toHaveBeenCalled();
    },
  );

  it("warns and continues when GitHub does not expose OAuth scope metadata", async () => {
    mocks.fetch.mockResolvedValue(new Response(null));

    await expect(assertGitHubWorkflowAccess()).resolves.toBeUndefined();

    expect(mocks.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "Continuing without verifying workflow-write permission",
      ),
    );
  });

  it.each([
    "git@github.com:pagopa/test-repo.git",
    "ssh://git@github.com/pagopa/test-repo.git",
  ])(
    "recognizes SSH push URL %s without requesting an HTTPS token",
    async (url) => {
      pushUrl = url;

      await expect(assertGitHubWorkflowAccess()).resolves.toBeUndefined();

      expect(mocks.git).toHaveBeenCalledTimes(1);
      expect(mocks.fetch).not.toHaveBeenCalled();
      expect(mocks.info).toHaveBeenCalledWith(
        expect.stringContaining("OAuth workflow scope does not apply"),
      );
    },
  );

  it("does not inspect a helper credential when Git has an HTTP Authorization override", async () => {
    extraHeaders = {
      exitCode: 0,
      stderr: "",
      stdout: "Authorization: Basic configured-authorization",
    };

    await expect(assertGitHubWorkflowAccess()).resolves.toBeUndefined();

    expect(mocks.git).toHaveBeenCalledTimes(2);
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.warn).toHaveBeenCalledWith(
      expect.stringContaining("HTTP Authorization header"),
    );
  });

  it("does not send credentials for a rewritten non-GitHub host to GitHub's API", async () => {
    pushUrl = "https://git.example.test/pagopa/test-repo.git";

    await expect(assertGitHubWorkflowAccess()).resolves.toBeUndefined();

    expect(mocks.git).toHaveBeenCalledTimes(1);
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.warn).toHaveBeenCalledWith(
      expect.stringContaining("effective push URL is not GitHub HTTPS or SSH"),
    );
  });

  it("withholds failed credential-helper output from verbose error details", async () => {
    credentialResult = {
      exitCode: 1,
      stderr: `helper failed with ${token}`,
      stdout: `password=${token}`,
    };

    const error = await assertGitHubWorkflowAccess().catch(
      (cause: unknown) => cause,
    );

    expect(error).toBeInstanceOf(Error);
    expect(inspect(error, { depth: null })).toContain(
      "No HTTPS Git credential is available non-interactively",
    );
    expect(inspect(error, { depth: null })).not.toContain(token);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it.each([401, 403, 500])(
    "reports GitHub verification failures (HTTP %i)",
    async (status) => {
      mocks.fetch.mockResolvedValue(new Response(null, { status }));

      await expect(assertGitHubWorkflowAccess()).rejects.toThrow(
        `HTTP ${status}`,
      );
      expect(mocks.warn).not.toHaveBeenCalled();
    },
  );

  it("withholds credential-bearing request errors rather than treating network failure as success", async () => {
    mocks.fetch.mockRejectedValue(new Error(`request failed: Bearer ${token}`));

    const error = await assertGitHubWorkflowAccess().catch(
      (cause: unknown) => cause,
    );

    expect(error).toBeInstanceOf(Error);
    expect(inspect(error, { depth: null })).toContain("Could not reach GitHub");
    expect(inspect(error, { depth: null })).not.toContain(token);
    expect(mocks.warn).not.toHaveBeenCalled();
  });
});
