import { beforeEach, expect, it, vi } from "vitest";

const githubMocks = vi.hoisted(() => ({
  ensureGitHubRepository: vi.fn(),
}));

const execaMocks = vi.hoisted(() => ({
  $: vi.fn(),
}));

const fsMocks = vi.hoisted(() => ({
  cp: vi.fn(),
  mkdtemp: vi.fn(),
  readdir: vi.fn(),
  rm: vi.fn(),
}));

const osMocks = vi.hoisted(() => ({
  tmpdir: vi.fn(),
}));

vi.mock("../octokit.ts", () => ({
  ensureGitHubRepository: githubMocks.ensureGitHubRepository,
}));

vi.mock("execa", () => ({
  $: execaMocks.$,
}));

vi.mock("node:fs/promises", () => fsMocks);

vi.mock("node:os", () => ({
  tmpdir: osMocks.tmpdir,
}));

import { getRepoNameFromProjectRoot, publishToGithub } from "../publisher.ts";

const defaultCommandResult = {
  exitCode: 0,
  stderr: "",
  stdout: "",
};

const publishInput = {
  description: "Terraform module description",
  githubOwner: "pagopa-dx",
  projectRoot: "infra/modules/azure_core_infra",
  provider: "aws",
  version: "1.2.3",
  workspaceRoot: "/repo",
};

const expectedRepo = "terraform-aws-azure-core-infra";
const expectedRepoUrl = `https://github.com/pagopa-dx/${expectedRepo}.git`;
const expectedTempDir = "/tmp-prefix/export-repo-XXXXXX";

const createGitCommandHarness = ({
  onCommand,
}: {
  onCommand?: (
    command: string,
    cwd: string | undefined,
  ) =>
    | Promise<typeof defaultCommandResult>
    | typeof defaultCommandResult
    | undefined;
} = {}) => {
  const commands: { command: string; cwd: string | undefined }[] = [];

  const git$ = vi.fn(
    (
      firstArg: TemplateStringsArray | { reject: boolean },
      ...values: unknown[]
    ) => {
      if (!("raw" in firstArg)) {
        return git$;
      }

      const command = String.raw(firstArg, ...values.map(String));
      // Extract cwd from the last call to execaMocks.$
      const lastCall =
        execaMocks.$.mock.calls[execaMocks.$.mock.calls.length - 1];
      const cwd = lastCall?.[0]?.cwd as string | undefined;
      commands.push({ command, cwd });
      const commandResult = onCommand?.(command, cwd);
      if (commandResult !== undefined) {
        return Promise.resolve(commandResult);
      }
      if (
        command.startsWith("git ls-remote --exit-code --tags origin refs/tags/")
      ) {
        return Promise.resolve({
          ...defaultCommandResult,
          exitCode: 2,
        });
      }
      return Promise.resolve(defaultCommandResult);
    },
  );

  execaMocks.$.mockReturnValue(git$);

  return {
    commands,
    git$,
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  osMocks.tmpdir.mockReturnValue("/tmp-prefix");
  fsMocks.mkdtemp.mockResolvedValue(expectedTempDir);
  fsMocks.readdir.mockResolvedValue([]);
  fsMocks.rm.mockResolvedValue(undefined);
  fsMocks.cp.mockResolvedValue(undefined);
});

it("publishes by committing on top of remote main without force-pushing history", async () => {
  const { commands } = createGitCommandHarness();

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: false,
    owner: "pagopa-dx",
    repo: expectedRepo,
  });

  await publishToGithub(publishInput);

  expect(githubMocks.ensureGitHubRepository).toHaveBeenCalledWith(
    "pagopa-dx",
    expectedRepo,
  );
  expect(osMocks.tmpdir).toHaveBeenCalledWith();
  expect(fsMocks.mkdtemp).toHaveBeenCalledWith("/tmp-prefix/export-repo-");
  expect(fsMocks.cp).toHaveBeenCalledWith(
    "/repo/infra/modules/azure_core_infra",
    expectedTempDir,
    { filter: expect.any(Function), recursive: true },
  );

  expect(commands.map((c) => ({ command: c.command, cwd: c.cwd }))).toEqual([
    { command: "git init -b main", cwd: expectedTempDir },
    {
      command: `git remote add origin ${expectedRepoUrl}`,
      cwd: expectedTempDir,
    },
    {
      command: "git ls-remote --exit-code --tags origin refs/tags/1.2.3",
      cwd: expectedTempDir,
    },
    {
      command: "git ls-remote --exit-code --heads origin main",
      cwd: expectedTempDir,
    },
    { command: "git fetch origin main", cwd: expectedTempDir },
    { command: "git checkout -B main origin/main", cwd: expectedTempDir },
    { command: "git add --all", cwd: expectedTempDir },
    { command: 'git commit -m "Release 1.2.3"', cwd: expectedTempDir },
    { command: "git tag -f 1.2.3", cwd: expectedTempDir },
    { command: "git push origin main", cwd: expectedTempDir },
    {
      command: "git push origin refs/tags/1.2.3 --force",
      cwd: expectedTempDir,
    },
  ]);

  expect(fsMocks.rm).toHaveBeenCalledWith(expectedTempDir, {
    force: true,
    recursive: true,
  });
});

it("bootstraps an empty remote repository on first publish", async () => {
  const { commands } = createGitCommandHarness({
    onCommand: (command) => {
      if (command === "git ls-remote --exit-code --heads origin main") {
        return { ...defaultCommandResult, exitCode: 2 };
      }
    },
  });

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: true,
    owner: "pagopa-dx",
    repo: expectedRepo,
  });

  await publishToGithub(publishInput);

  expect(commands.map((c) => c.command)).toContain(
    'git commit -m "Release 1.2.3"',
  );
  expect(commands.map((c) => c.command)).not.toContain(
    "git push origin main --force",
  );
});

it("removes stray export files before checking out remote main", async () => {
  const checkoutFailure = new Error(
    "error: The following untracked working tree files would be overwritten by checkout:",
  );

  createGitCommandHarness({
    onCommand: (command) => {
      if (command === "git checkout -B main origin/main") {
        const removedBeforeCheckout = fsMocks.rm.mock.calls.some(
          ([path]) => path === `${expectedTempDir}/README.md`,
        );

        if (!removedBeforeCheckout) {
          return Promise.reject(checkoutFailure);
        }
      }
    },
  });

  fsMocks.readdir
    .mockResolvedValueOnce([{ name: "README.md" }])
    .mockResolvedValueOnce([{ name: "README.md" }]);

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: false,
    owner: "pagopa-dx",
    repo: expectedRepo,
  });

  await expect(publishToGithub(publishInput)).resolves.toBe("published");
  expect(fsMocks.rm).toHaveBeenCalledWith(`${expectedTempDir}/README.md`, {
    force: true,
    recursive: true,
  });
});

it("excludes .git directory when copying module contents", async () => {
  createGitCommandHarness();

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: false,
    owner: "pagopa-dx",
    repo: expectedRepo,
  });

  await publishToGithub(publishInput);

  expect(fsMocks.cp).toHaveBeenCalledWith(
    "/repo/infra/modules/azure_core_infra",
    expectedTempDir,
    { filter: expect.any(Function), recursive: true },
  );

  // Verify filter function behavior
  const cpCall = fsMocks.cp.mock.calls[0];
  const filterFn = cpCall[2].filter;

  expect(filterFn("/some/path/.git")).toBe(false);
  expect(filterFn("/some/path/.git/config")).toBe(false);
  expect(filterFn("/some/path/file.txt")).toBe(true);
  expect(filterFn("/some/path/subdir/.git")).toBe(false);
});

it("uses shell mode plus explicit commit author and committer environment variables", async () => {
  createGitCommandHarness();

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: false,
    owner: "pagopa-dx",
    repo: expectedRepo,
  });

  await publishToGithub(publishInput);

  // Check that execa $ was called with env variables
  const execaCalls = execaMocks.$.mock.calls;
  const commitCall = execaCalls.find((call) => call[0]?.env !== undefined);

  // Verify the call exists
  if (commitCall === undefined) {
    throw new Error("Expected to find a call with env variables");
  }

  expect(commitCall[0].shell).toBe(true);
  expect(commitCall[0].env).toMatchObject({
    GIT_AUTHOR_EMAIL: "pagopa-dx-bot@pagopa.it",
    GIT_AUTHOR_NAME: "PagoPA DX Bot",
    GIT_COMMITTER_EMAIL: "pagopa-dx-bot@pagopa.it",
    GIT_COMMITTER_NAME: "PagoPA DX Bot",
  });
});

it("cleans up temporary directory after successful publish", async () => {
  createGitCommandHarness();

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: false,
    owner: "pagopa-dx",
    repo: expectedRepo,
  });

  await publishToGithub(publishInput);

  expect(fsMocks.rm).toHaveBeenCalledWith(expectedTempDir, {
    force: true,
    recursive: true,
  });
});

it("cleans up temporary directory even when publish fails", async () => {
  const failure = new Error("push failed");
  createGitCommandHarness({
    onCommand: (command) => {
      if (command.startsWith("git push ")) {
        return Promise.reject(failure);
      }
    },
  });

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: false,
    owner: "pagopa-dx",
    repo: expectedRepo,
  });

  await expect(publishToGithub(publishInput)).rejects.toBe(failure);

  expect(fsMocks.rm).toHaveBeenCalledWith(expectedTempDir, {
    force: true,
    recursive: true,
  });
});

it("reports cleanup failure if cleanup fails but publish succeeded", async () => {
  const cleanupError = new Error("ENOENT: no such file or directory");
  createGitCommandHarness();

  fsMocks.rm.mockRejectedValue(cleanupError);

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: false,
    owner: "pagopa-dx",
    repo: expectedRepo,
  });

  await expect(publishToGithub(publishInput)).rejects.toThrow(
    /Failed to remove temporary export directory/,
  );
});

it("prioritizes publish failure over cleanup failure", async () => {
  const publishError = new Error("push failed");
  const cleanupError = new Error("cleanup failed");

  createGitCommandHarness({
    onCommand: (command) => {
      if (command.startsWith("git push ")) {
        return Promise.reject(publishError);
      }
    },
  });

  fsMocks.rm.mockRejectedValue(cleanupError);

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: false,
    owner: "pagopa-dx",
    repo: expectedRepo,
  });

  // Should throw the publish error, not the cleanup error
  await expect(publishToGithub(publishInput)).rejects.toBe(publishError);
});

it("correctly extracts module name from Windows-style path", () => {
  const result = getRepoNameFromProjectRoot(
    "infra\\modules\\azure_core_infra",
    "aws",
  );
  expect(result).toBe("terraform-aws-azure-core-infra");
});

it("correctly extracts module name from mixed-separator path", () => {
  const result = getRepoNameFromProjectRoot(
    "infra/modules\\azure_core_infra",
    "azure",
  );
  expect(result).toBe("terraform-azure-azure-core-infra");
});

it("excludes .git directory when copying module contents with Windows paths", async () => {
  createGitCommandHarness();

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: false,
    owner: "pagopa-dx",
    repo: expectedRepo,
  });

  await publishToGithub(publishInput);

  const cpCall = fsMocks.cp.mock.calls[0];
  const filterFn = cpCall[2].filter;

  // Test Windows-style paths
  expect(filterFn("C:\\some\\path\\.git")).toBe(false);
  expect(filterFn("C:\\some\\path\\.git\\config")).toBe(false);
  expect(filterFn("C:\\some\\path\\file.txt")).toBe(true);
  expect(filterFn("C:\\some\\path\\subdir\\.git")).toBe(false);
  expect(filterFn("C:\\some\\path\\subdir\\.gitignore")).toBe(true);
});

it("creates and force-pushes a tag named after version", async () => {
  const { commands } = createGitCommandHarness();

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: false,
    owner: "pagopa-dx",
    repo: expectedRepo,
  });

  await publishToGithub(publishInput);

  expect(commands.map((c) => ({ command: c.command, cwd: c.cwd }))).toEqual([
    { command: "git init -b main", cwd: expectedTempDir },
    {
      command: `git remote add origin ${expectedRepoUrl}`,
      cwd: expectedTempDir,
    },
    {
      command: "git ls-remote --exit-code --tags origin refs/tags/1.2.3",
      cwd: expectedTempDir,
    },
    {
      command: "git ls-remote --exit-code --heads origin main",
      cwd: expectedTempDir,
    },
    { command: "git fetch origin main", cwd: expectedTempDir },
    { command: "git checkout -B main origin/main", cwd: expectedTempDir },
    { command: "git add --all", cwd: expectedTempDir },
    { command: 'git commit -m "Release 1.2.3"', cwd: expectedTempDir },
    { command: "git tag -f 1.2.3", cwd: expectedTempDir },
    { command: "git push origin main", cwd: expectedTempDir },
    {
      command: "git push origin refs/tags/1.2.3 --force",
      cwd: expectedTempDir,
    },
  ]);
});

it("skips publishing when the remote tag already exists", async () => {
  const { commands } = createGitCommandHarness({
    onCommand: (command) => {
      if (
        command === "git ls-remote --exit-code --tags origin refs/tags/1.2.3"
      ) {
        return {
          ...defaultCommandResult,
          stdout: "abc123\trefs/tags/1.2.3",
        };
      }
    },
  });

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: false,
    owner: "pagopa-dx",
    repo: expectedRepo,
  });

  await expect(publishToGithub(publishInput)).resolves.toBe("skipped");

  expect(commands.map((c) => c.command)).toEqual([
    "git init -b main",
    `git remote add origin ${expectedRepoUrl}`,
    "git ls-remote --exit-code --tags origin refs/tags/1.2.3",
  ]);
});

it("fails publish if tag push fails after branch push succeeds", async () => {
  const tagPushError = new Error("tag push failed");
  createGitCommandHarness({
    onCommand: (command) => {
      if (command.startsWith("git push origin refs/tags/")) {
        return Promise.reject(tagPushError);
      }
    },
  });

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: false,
    owner: "pagopa-dx",
    repo: expectedRepo,
  });

  await expect(publishToGithub(publishInput)).rejects.toBe(tagPushError);

  expect(fsMocks.rm).toHaveBeenCalledWith(expectedTempDir, {
    force: true,
    recursive: true,
  });
});
