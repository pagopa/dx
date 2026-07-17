import { beforeEach, expect, it, vi } from "vitest";

const githubMocks = vi.hoisted(() => ({
  appOctokit: { client: "app" },
  createGitHubAppOctokit: vi.fn(),
  createGitHubAppToken: vi.fn(),
  ensureGitHubRepository: vi.fn(),
  revokeGitHubAppToken: vi.fn(),
}));

const octokitMocks = vi.hoisted(() => {
  const repoOctokit = { client: "repo" };
  const Octokit = vi.fn(function Octokit() {
    return repoOctokit;
  });

  return {
    Octokit,
    repoOctokit,
  };
});

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
  createGitHubAppOctokit: githubMocks.createGitHubAppOctokit,
  createGitHubAppToken: githubMocks.createGitHubAppToken,
  ensureGitHubRepository: githubMocks.ensureGitHubRepository,
  revokeGitHubAppToken: githubMocks.revokeGitHubAppToken,
}));

vi.mock("octokit", () => ({
  Octokit: octokitMocks.Octokit,
}));

vi.mock("execa", () => ({
  $: execaMocks.$,
}));

vi.mock("node:fs/promises", () => fsMocks);

vi.mock("node:os", () => ({
  tmpdir: osMocks.tmpdir,
}));

import {
  getRepoNameFromProjectRoot,
  publishToGithub,
  type PublishToGithubInput,
} from "../publisher.ts";

const defaultCommandResult = {
  exitCode: 0,
  stderr: "",
  stdout: "",
};

const publishOptions = {
  description: "Terraform module description",
  githubOwner: "pagopa-dx",
  projectRoot: "infra/modules/azure_core_infra",
  provider: "aws",
  version: "1.2.3",
  workspaceRoot: "/repo",
};

const publishInput = {
  ...publishOptions,
  githubAppCredentials: {
    clientId: "Iv23.client-id",
    privateKey: "private-key",
  },
  useGitHubAppAuthentication: true,
} satisfies PublishToGithubInput;

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
  githubMocks.createGitHubAppOctokit.mockReturnValue(githubMocks.appOctokit);
  githubMocks.createGitHubAppToken.mockResolvedValue("installation-token");
  githubMocks.revokeGitHubAppToken.mockResolvedValue(undefined);
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
    octokitMocks.repoOctokit,
  );
  expect(githubMocks.createGitHubAppOctokit).toHaveBeenCalledWith({
    clientId: "Iv23.client-id",
    privateKey: "private-key",
  });
  expect(githubMocks.createGitHubAppToken).toHaveBeenCalledWith(
    "pagopa-dx",
    {
      clientId: "Iv23.client-id",
      privateKey: "private-key",
    },
    githubMocks.appOctokit,
  );
  expect(octokitMocks.Octokit).toHaveBeenCalledWith({
    auth: "installation-token",
  });
  expect(osMocks.tmpdir).toHaveBeenCalledWith();
  expect(fsMocks.mkdtemp).toHaveBeenCalledWith("/tmp-prefix/export-repo-");
  expect(fsMocks.cp).toHaveBeenCalledWith(
    "/repo/infra/modules/azure_core_infra",
    expectedTempDir,
    { filter: expect.any(Function), recursive: true },
  );

  expect(commands.map((c) => ({ command: c.command, cwd: c.cwd }))).toEqual([
    { command: "git init -b main", cwd: expectedTempDir },
    { command: "gh auth setup-git", cwd: expectedTempDir },
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

it("configures git credentials and keeps the remote URL token-free", async () => {
  const { commands } = createGitCommandHarness();

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: false,
    owner: "pagopa-dx",
    repo: expectedRepo,
  });

  await publishToGithub(publishInput);

  const commandStrings = commands.map((c) => c.command);
  expect(commandStrings).toContain("gh auth setup-git");
  expect(commandStrings).toContain(`git remote add origin ${expectedRepoUrl}`);
  expect(commandStrings.join("\n")).not.toContain("installation-token");
  expect(execaMocks.$).toHaveBeenCalledWith(
    expect.objectContaining({
      env: expect.objectContaining({
        GH_TOKEN: "installation-token",
      }),
    }),
  );
});

it("uses the provided token without generating a GitHub App token", async () => {
  createGitCommandHarness();
  const legacyInput = {
    ...publishOptions,
    githubToken: "legacy-token",
    useGitHubAppAuthentication: false,
  } satisfies PublishToGithubInput;

  await publishToGithub(legacyInput);

  expect(githubMocks.createGitHubAppToken).not.toHaveBeenCalled();
  expect(githubMocks.revokeGitHubAppToken).not.toHaveBeenCalled();
  expect(githubMocks.ensureGitHubRepository).toHaveBeenCalledWith(
    "pagopa-dx",
    expectedRepo,
    octokitMocks.repoOctokit,
  );
  expect(octokitMocks.Octokit).toHaveBeenCalledWith({
    auth: "legacy-token",
  });
  expect(execaMocks.$).toHaveBeenCalledWith(
    expect.objectContaining({
      env: expect.objectContaining({ GH_TOKEN: "legacy-token" }),
    }),
  );
});

it("revokes the GitHub App token after a successful publish", async () => {
  createGitCommandHarness();

  await publishToGithub(publishInput);

  expect(githubMocks.revokeGitHubAppToken).toHaveBeenCalledWith(
    octokitMocks.repoOctokit,
  );
});

it("fails with revoke error when token revocation fails after a successful publish", async () => {
  const revokeError = new Error("revoke failed");
  createGitCommandHarness();
  githubMocks.revokeGitHubAppToken.mockRejectedValue(revokeError);

  await expect(publishToGithub(publishInput)).rejects.toBe(revokeError);
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
  expect(githubMocks.revokeGitHubAppToken).toHaveBeenCalledWith(
    octokitMocks.repoOctokit,
  );
});

it("prioritizes publish failure over revoke failure", async () => {
  const publishError = new Error("push failed");
  const revokeError = new Error("revoke failed");
  createGitCommandHarness({
    onCommand: (command) => {
      if (command.startsWith("git push ")) {
        return Promise.reject(publishError);
      }
    },
  });
  githubMocks.revokeGitHubAppToken.mockRejectedValue(revokeError);

  await expect(publishToGithub(publishInput)).rejects.toBe(publishError);
  expect(githubMocks.revokeGitHubAppToken).toHaveBeenCalledWith(
    octokitMocks.repoOctokit,
  );
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
    { command: "gh auth setup-git", cwd: expectedTempDir },
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

it("still tags and pushes when there is nothing to commit (content already matches remote)", async () => {
  const { commands } = createGitCommandHarness({
    onCommand: (command) => {
      if (command === 'git commit -m "Release 1.2.3"') {
        return {
          exitCode: 1,
          stderr: "",
          stdout: "On branch main\nnothing to commit, working tree clean",
        };
      }
    },
  });

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: false,
    owner: "pagopa-dx",
    repo: expectedRepo,
  });

  await expect(publishToGithub(publishInput)).resolves.toBe("published");

  expect(commands.map((c) => c.command)).toEqual([
    "git init -b main",
    "gh auth setup-git",
    `git remote add origin ${expectedRepoUrl}`,
    "git ls-remote --exit-code --tags origin refs/tags/1.2.3",
    "git ls-remote --exit-code --heads origin main",
    "git fetch origin main",
    "git checkout -B main origin/main",
    "git add --all",
    'git commit -m "Release 1.2.3"',
    "git tag -f 1.2.3",
    "git push origin main",
    "git push origin refs/tags/1.2.3 --force",
  ]);
});

it("fails when git commit fails for a reason other than nothing to commit", async () => {
  createGitCommandHarness({
    onCommand: (command) => {
      if (command === 'git commit -m "Release 1.2.3"') {
        return {
          exitCode: 1,
          stderr: "fatal: unable to write commit object",
          stdout: "",
        };
      }
    },
  });

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: false,
    owner: "pagopa-dx",
    repo: expectedRepo,
  });

  await expect(publishToGithub(publishInput)).rejects.toThrow(
    /Failed to commit release 1.2.3/,
  );
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
    "gh auth setup-git",
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
