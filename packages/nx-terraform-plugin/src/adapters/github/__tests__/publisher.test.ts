import { beforeEach, expect, it, vi } from "vitest";

const githubMocks = vi.hoisted(() => ({
  ensureGitHubRepository: vi.fn(),
}));

const execaMocks = vi.hoisted(() => ({
  $: vi.fn(),
}));

vi.mock("../octokit.ts", () => ({
  ensureGitHubRepository: githubMocks.ensureGitHubRepository,
}));

vi.mock("execa", () => ({
  $: execaMocks.$,
}));

import { publishToGithub } from "../publisher.ts";

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

const expectedRemote = "pagopa-dx-terraform-aws-azure-core-infra";
const expectedBranch = "azure_core_infra-branch";

const isTemplateStringsArray = (
  value: unknown,
): value is TemplateStringsArray =>
  Array.isArray(value) &&
  typeof value === "object" &&
  value !== null &&
  "raw" in value &&
  Array.isArray(value.raw);

const createGitCommandHarness = ({
  onSafeCommand,
  onStrictCommand,
}: {
  onSafeCommand?: (
    command: string,
  ) => Promise<typeof defaultCommandResult> | typeof defaultCommandResult;
  onStrictCommand?: (
    command: string,
  ) => Promise<typeof defaultCommandResult> | typeof defaultCommandResult;
} = {}) => {
  const safeCommands: string[] = [];
  const strictCommands: string[] = [];

  const safeGit$ = vi.fn(
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      const command = String.raw(strings, ...values.map(String));
      safeCommands.push(command);
      return Promise.resolve(onSafeCommand?.(command) ?? defaultCommandResult);
    },
  );

  const git$ = vi.fn((first: unknown, ...values: unknown[]) => {
    if (!isTemplateStringsArray(first)) {
      return safeGit$;
    }

    const command = String.raw(first, ...values.map(String));
    strictCommands.push(command);
    return Promise.resolve(onStrictCommand?.(command) ?? defaultCommandResult);
  });

  execaMocks.$.mockReturnValue(git$);

  return {
    git$,
    safeCommands,
    strictCommands,
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

it("ensures the target repository before syncing the module subtree", async () => {
  const { git$, safeCommands, strictCommands } = createGitCommandHarness();

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: false,
    owner: "pagopa-dx",
    repo: "terraform-aws-azure-core-infra",
  });

  await publishToGithub(publishInput);

  expect(githubMocks.ensureGitHubRepository).toHaveBeenCalledWith(
    "pagopa-dx",
    "terraform-aws-azure-core-infra",
  );
  expect(execaMocks.$).toHaveBeenCalledWith({
    cwd: "/repo",
  });
  expect(git$).toHaveBeenCalledWith({ reject: false });
  expect(strictCommands).toEqual([
    `git remote add ${expectedRemote} https://github.com/pagopa-dx/terraform-aws-azure-core-infra.git`,
    `git subtree split --prefix=infra/modules/azure_core_infra -b ${expectedBranch}`,
    `git fetch ${expectedRemote} main --tags`,
    `git checkout ${expectedBranch}`,
    `git merge --allow-unrelated-histories -s ours --no-edit ${expectedRemote}/main`,
    `git push ${expectedRemote} ${expectedBranch}:main`,
  ]);
  expect(safeCommands).toEqual([
    "git remote",
    `git branch --list ${expectedBranch}`,
    `git ls-remote --exit-code --heads ${expectedRemote} refs/heads/main`,
    `git remote remove ${expectedRemote}`,
    `git branch -D ${expectedBranch}`,
  ]);
});

it("checks out the split branch before merging remote history when the remote main branch exists", async () => {
  const { strictCommands } = createGitCommandHarness();

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: false,
    owner: "pagopa-dx",
    repo: "terraform-aws-azure-core-infra",
  });

  await publishToGithub(publishInput);

  expect(strictCommands).toContain(`git checkout ${expectedBranch}`);
  expect(strictCommands.indexOf(`git checkout ${expectedBranch}`)).toBeLessThan(
    strictCommands.indexOf(
      `git merge --allow-unrelated-histories -s ours --no-edit ${expectedRemote}/main`,
    ),
  );
});

it("pushes the split branch directly when the remote main branch does not exist", async () => {
  const { safeCommands, strictCommands } = createGitCommandHarness({
    onSafeCommand: (command) =>
      command.startsWith("git ls-remote ")
        ? { ...defaultCommandResult, exitCode: 2 }
        : defaultCommandResult,
  });

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: true,
    owner: "pagopa-dx",
    repo: "terraform-aws-azure-core-infra",
  });

  await publishToGithub(publishInput);

  expect(githubMocks.ensureGitHubRepository).toHaveBeenCalledWith(
    "pagopa-dx",
    "terraform-aws-azure-core-infra",
  );
  expect(execaMocks.$).toHaveBeenCalledWith({
    cwd: "/repo",
  });
  expect(strictCommands).toEqual([
    `git remote add ${expectedRemote} https://github.com/pagopa-dx/terraform-aws-azure-core-infra.git`,
    `git subtree split --prefix=infra/modules/azure_core_infra -b ${expectedBranch}`,
    `git push ${expectedRemote} ${expectedBranch}:main`,
  ]);
  expect(safeCommands).toEqual([
    "git remote",
    `git branch --list ${expectedBranch}`,
    `git ls-remote --exit-code --heads ${expectedRemote} refs/heads/main`,
    `git remote remove ${expectedRemote}`,
    `git branch -D ${expectedBranch}`,
  ]);
});

it("throws when checking the remote main branch fails unexpectedly", async () => {
  const { safeCommands, strictCommands } = createGitCommandHarness({
    onSafeCommand: (command) =>
      command.startsWith("git ls-remote ")
        ? {
            ...defaultCommandResult,
            exitCode: 128,
            stderr: "fatal: unable to access remote",
          }
        : defaultCommandResult,
  });

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: false,
    owner: "pagopa-dx",
    repo: "terraform-aws-azure-core-infra",
  });

  await expect(publishToGithub(publishInput)).rejects.toThrow();

  expect(strictCommands).toEqual([
    `git remote add ${expectedRemote} https://github.com/pagopa-dx/terraform-aws-azure-core-infra.git`,
    `git subtree split --prefix=infra/modules/azure_core_infra -b ${expectedBranch}`,
  ]);
  expect(safeCommands).toEqual([
    "git remote",
    `git branch --list ${expectedBranch}`,
    `git ls-remote --exit-code --heads ${expectedRemote} refs/heads/main`,
    `git remote remove ${expectedRemote}`,
    `git branch -D ${expectedBranch}`,
  ]);
});

it("removes the temporary remote and subtree branch after a successful publish", async () => {
  const { safeCommands } = createGitCommandHarness();

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: false,
    owner: "pagopa-dx",
    repo: "terraform-aws-azure-core-infra",
  });

  await publishToGithub(publishInput);

  expect(safeCommands).toContain(`git remote remove ${expectedRemote}`);
  expect(safeCommands).toContain(`git branch -D ${expectedBranch}`);
});

it("still cleans up temporary git state when publish fails after creating it", async () => {
  const failure = new Error("push failed");
  const { safeCommands } = createGitCommandHarness({
    onSafeCommand: (command) =>
      command.startsWith("git ls-remote ")
        ? { ...defaultCommandResult, exitCode: 2 }
        : defaultCommandResult,
    onStrictCommand: (command) => {
      if (command.startsWith("git push ")) {
        return Promise.reject(failure);
      }

      return defaultCommandResult;
    },
  });

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: false,
    owner: "pagopa-dx",
    repo: "terraform-aws-azure-core-infra",
  });

  await expect(publishToGithub(publishInput)).rejects.toBe(failure);

  expect(safeCommands).toContain(`git remote remove ${expectedRemote}`);
  expect(safeCommands).toContain(`git branch -D ${expectedBranch}`);
});

it("self-heals reruns by removing stale temporary git artifacts before recreating them", async () => {
  let hasStaleRemote = true;
  let hasStaleBranch = true;
  const { safeCommands, strictCommands } = createGitCommandHarness({
    onSafeCommand: (command) => {
      if (command === "git remote") {
        return {
          ...defaultCommandResult,
          stdout: hasStaleRemote ? `${expectedRemote}\norigin` : "origin",
        };
      }

      if (command === `git branch --list ${expectedBranch}`) {
        return {
          ...defaultCommandResult,
          stdout: hasStaleBranch ? expectedBranch : "",
        };
      }

      return defaultCommandResult;
    },
    onStrictCommand: (command) => {
      if (command === `git remote remove ${expectedRemote}`) {
        hasStaleRemote = false;
        return defaultCommandResult;
      }

      if (command === `git branch -D ${expectedBranch}`) {
        hasStaleBranch = false;
        return defaultCommandResult;
      }

      if (
        command ===
          `git remote add ${expectedRemote} https://github.com/pagopa-dx/terraform-aws-azure-core-infra.git` &&
        hasStaleRemote
      ) {
        return Promise.reject(new Error("remote already exists"));
      }

      if (
        command ===
          `git subtree split --prefix=infra/modules/azure_core_infra -b ${expectedBranch}` &&
        hasStaleBranch
      ) {
        return Promise.reject(new Error("branch already exists"));
      }

      return defaultCommandResult;
    },
  });

  githubMocks.ensureGitHubRepository.mockResolvedValue({
    created: false,
    owner: "pagopa-dx",
    repo: "terraform-aws-azure-core-infra",
  });

  await publishToGithub(publishInput);

  expect(strictCommands).toEqual([
    `git remote remove ${expectedRemote}`,
    `git branch -D ${expectedBranch}`,
    `git remote add ${expectedRemote} https://github.com/pagopa-dx/terraform-aws-azure-core-infra.git`,
    `git subtree split --prefix=infra/modules/azure_core_infra -b ${expectedBranch}`,
    `git fetch ${expectedRemote} main --tags`,
    `git checkout ${expectedBranch}`,
    `git merge --allow-unrelated-histories -s ours --no-edit ${expectedRemote}/main`,
    `git push ${expectedRemote} ${expectedBranch}:main`,
  ]);
  expect(safeCommands).toEqual([
    "git remote",
    `git branch --list ${expectedBranch}`,
    `git ls-remote --exit-code --heads ${expectedRemote} refs/heads/main`,
    `git remote remove ${expectedRemote}`,
    `git branch -D ${expectedBranch}`,
  ]);
});
