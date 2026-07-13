import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TagEntry } from "../shared.js";

interface PullRequestData {
  body: null | string;
}

const {
  extractTagEntriesFromPRBodyMock,
  fsReadFileMock,
  getNxProjectNamesMock,
  getNxProjectRootMock,
  isEnvironmentProjectMock,
  matchProjectNameMock,
  pullsGetMock,
} = vi.hoisted(() => ({
  extractTagEntriesFromPRBodyMock: vi.fn<(prBody: string) => TagEntry[]>(),
  fsReadFileMock: vi.fn<(path: string, encoding: string) => Promise<string>>(
    async () => "",
  ),
  getNxProjectNamesMock: vi.fn<() => Promise<string[]>>(async () => []),
  getNxProjectRootMock: vi.fn<(projectName: string) => Promise<null | string>>(
    async () => null,
  ),
  isEnvironmentProjectMock: vi.fn<(projectName: string) => Promise<boolean>>(
    async () => false,
  ),
  matchProjectNameMock: vi.fn<
    (tag: string, projectNames: string[]) => null | string
  >(() => null),
  pullsGetMock: vi.fn<
    (params: {
      owner: string;
      pull_number: number;
      repo: string;
    }) => Promise<{ data: PullRequestData }>
  >(async () => ({ data: { body: null } })),
}));

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: fsReadFileMock,
  },
}));

vi.mock("../shared.js", async () => {
  const actual =
    await vi.importActual<typeof import("../shared.js")>("../shared.js");

  return {
    ...actual,
    createOctokit: () => ({
      pulls: {
        get: pullsGetMock,
      },
    }),
    extractTagEntriesFromPRBody: extractTagEntriesFromPRBodyMock,
    getNxProjectNames: getNxProjectNamesMock,
    getNxProjectRoot: getNxProjectRootMock,
    getRepoInfo: async () => ({ owner: "pagopa", repo: "dx" }),
    isEnvironmentProject: isEnvironmentProjectMock,
    matchProjectName: matchProjectNameMock,
  };
});

import { run } from "../extract-infra-projects-to-apply.js";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("PR_NUMBER", "123");
});

describe("run output", () => {
  it("outputs only matched environment projects", async () => {
    pullsGetMock.mockResolvedValue({
      data: {
        body: "<!-- nx-release-tags: [] -->",
      },
    });
    extractTagEntriesFromPRBodyMock.mockReturnValue([
      { path: null, tag: "infra-resources-dev@1.0.0", version: "1.0.0" },
      { path: null, tag: "infra-modules-storage@1.0.0", version: "1.0.0" },
    ]);
    getNxProjectNamesMock.mockResolvedValue([
      "infra-resources-dev",
      "infra-modules-storage",
    ]);
    matchProjectNameMock.mockImplementation((tag) => {
      if (tag.startsWith("infra-resources-dev")) {
        return "infra-resources-dev";
      }

      if (tag.startsWith("infra-modules-storage")) {
        return "infra-modules-storage";
      }

      return null;
    });
    isEnvironmentProjectMock.mockImplementation(
      async (projectName) => projectName === "infra-resources-dev",
    );
    getNxProjectRootMock.mockResolvedValue("infra/resources/dev");
    fsReadFileMock.mockResolvedValue(
      JSON.stringify({
        version: "1.0.0",
      }),
    );

    const stdoutWriteSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await run();

    expect(pullsGetMock).toHaveBeenCalledWith({
      owner: "pagopa",
      pull_number: 123,
      repo: "dx",
    });
    expect(stdoutWriteSpy).toHaveBeenCalledWith(
      '[{"project":"infra-resources-dev","applyEnvironment":"infra-dev-cd","planEnvironment":"infra-dev-ci","runnerLabel":"dev"}]',
    );
    expect(fsReadFileMock).toHaveBeenCalledWith(
      "infra/resources/dev/environment.json",
      "utf8",
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "✓ infra-resources-dev is an environment project",
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "✗ infra-modules-storage is not an environment project, skipping",
    );
  });

  it("writes an empty string when the PR body is empty", async () => {
    pullsGetMock.mockResolvedValue({
      data: {
        body: null,
      },
    });

    const stdoutWriteSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await run();

    expect(stdoutWriteSpy).toHaveBeenCalledWith("[]");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "::warning::PR body is empty, no environment projects to apply",
    );
  });

  it("writes an empty string when no tag metadata is found", async () => {
    pullsGetMock.mockResolvedValue({
      data: {
        body: "no metadata here",
      },
    });
    extractTagEntriesFromPRBodyMock.mockReturnValue([]);

    const stdoutWriteSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await run();

    expect(stdoutWriteSpy).toHaveBeenCalledWith("[]");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "::warning::No nx-release-tags metadata found in PR body, no environment projects to apply",
    );
  });

  it("writes an empty string when no tags match Nx projects", async () => {
    pullsGetMock.mockResolvedValue({
      data: {
        body: "<!-- nx-release-tags: [] -->",
      },
    });
    extractTagEntriesFromPRBodyMock.mockReturnValue([
      { path: null, tag: "unknown-project@1.0.0", version: "1.0.0" },
    ]);
    getNxProjectNamesMock.mockResolvedValue(["infra-resources-dev"]);
    matchProjectNameMock.mockReturnValue(null);

    const stdoutWriteSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await run();

    expect(stdoutWriteSpy).toHaveBeenCalledWith("[]");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "::warning::No projects extracted from tags",
    );
  });
});

describe("run validation", () => {
  it("writes an empty string when matched projects are not environment projects", async () => {
    pullsGetMock.mockResolvedValue({
      data: {
        body: "<!-- nx-release-tags: [] -->",
      },
    });
    extractTagEntriesFromPRBodyMock.mockReturnValue([
      { path: null, tag: "infra-modules-storage@1.0.0", version: "1.0.0" },
    ]);
    getNxProjectNamesMock.mockResolvedValue(["infra-modules-storage"]);
    matchProjectNameMock.mockReturnValue("infra-modules-storage");
    isEnvironmentProjectMock.mockResolvedValue(false);

    const stdoutWriteSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await run();

    expect(stdoutWriteSpy).toHaveBeenCalledWith("[]");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "::warning::No environment projects found to apply",
    );
  });

  it("throws when PR_NUMBER is missing", async () => {
    vi.unstubAllEnvs();

    await expect(run()).rejects.toThrow(
      "PR_NUMBER environment variable is required",
    );
  });

  it("throws when deployment metadata is invalid", async () => {
    pullsGetMock.mockResolvedValue({
      data: {
        body: "<!-- nx-release-tags: [] -->",
      },
    });
    extractTagEntriesFromPRBodyMock.mockReturnValue([
      { path: null, tag: "infra-resources-dev@1.0.0", version: "1.0.0" },
    ]);
    getNxProjectNamesMock.mockResolvedValue(["infra-resources-dev"]);
    matchProjectNameMock.mockReturnValue("infra-resources-dev");
    isEnvironmentProjectMock.mockResolvedValue(true);
    getNxProjectRootMock.mockResolvedValue("infra/resources/dev");
    fsReadFileMock.mockResolvedValue(
      JSON.stringify({
        deployment: {
          applyEnvironment: "",
          planEnvironment: "infra-dev-ci",
          runnerLabel: "dev",
        },
      }),
    );

    await expect(run()).rejects.toThrow(
      'Invalid deployment metadata in "infra/resources/dev/environment.json"',
    );
  });
});
