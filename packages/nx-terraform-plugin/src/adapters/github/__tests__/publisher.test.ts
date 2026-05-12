import { beforeEach, describe, expect, it, vi } from "vitest";

const githubMocks = vi.hoisted(() => ({
  ensureGitHubRepository: vi.fn(),
}));

const execaMocks = vi.hoisted(() => ({
  $: vi.fn(),
  execa: vi.fn(),
}));

vi.mock("../octokit.ts", () => ({
  ensureGitHubRepository: githubMocks.ensureGitHubRepository,
}));

vi.mock("execa", () => ({
  $: execaMocks.$,
  execa: execaMocks.execa,
}));

import { publishToGithub } from "../publisher.ts";

describe("publishToGithub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ensures the target repository before syncing the module subtree", async () => {
    const commands: string[] = [];
    const git$ = vi.fn(
      async (strings: TemplateStringsArray, ...values: string[]) => {
        commands.push(String.raw({ raw: strings }, ...values));
      },
    );

    githubMocks.ensureGitHubRepository.mockResolvedValue({
      created: false,
      owner: "pagopa-dx",
      repo: "terraform-aws-azure-core-infra",
    });
    execaMocks.$.mockReturnValue(git$);
    execaMocks.execa.mockResolvedValue({ exitCode: 0, stderr: "", stdout: "" });

    await publishToGithub({
      description: "Terraform module description",
      githubOwner: "pagopa-dx",
      projectRoot: "infra/modules/azure_core_infra",
      provider: "aws",
      version: "1.2.3",
      workspaceRoot: "/repo",
    });

    expect(githubMocks.ensureGitHubRepository).toHaveBeenCalledWith(
      "pagopa-dx",
      "terraform-aws-azure-core-infra",
    );
    expect(execaMocks.$).toHaveBeenCalledWith({
      cwd: "/repo",
    });
    expect(execaMocks.execa).toHaveBeenCalledWith(
      "git",
      [
        "ls-remote",
        "--exit-code",
        "--heads",
        "pagopa-dx-terraform-aws-azure-core-infra",
        "refs/heads/main",
      ],
      { cwd: "/repo", reject: false },
    );
    expect(commands).toEqual([
      "git remote add pagopa-dx-terraform-aws-azure-core-infra https://github.com/pagopa-dx/terraform-aws-azure-core-infra.git",
      "git subtree split --prefix=infra/modules/azure_core_infra -b azure_core_infra-branch",
      "git fetch pagopa-dx-terraform-aws-azure-core-infra main --tags",
      "git checkout azure_core_infra-branch",
      "git merge --allow-unrelated-histories -s ours --no-edit pagopa-dx-terraform-aws-azure-core-infra/main",
      "git push pagopa-dx-terraform-aws-azure-core-infra azure_core_infra-branch:main",
    ]);
  });

  it("checks out the split branch before merging remote history when the remote main branch exists", async () => {
    const commands: string[] = [];
    const git$ = vi.fn(
      async (strings: TemplateStringsArray, ...values: string[]) => {
        commands.push(String.raw({ raw: strings }, ...values));
      },
    );

    githubMocks.ensureGitHubRepository.mockResolvedValue({
      created: false,
      owner: "pagopa-dx",
      repo: "terraform-aws-azure-core-infra",
    });
    execaMocks.$.mockReturnValue(git$);
    execaMocks.execa.mockResolvedValue({ exitCode: 0, stderr: "", stdout: "" });

    await publishToGithub({
      description: "Terraform module description",
      githubOwner: "pagopa-dx",
      projectRoot: "infra/modules/azure_core_infra",
      provider: "aws",
      version: "1.2.3",
      workspaceRoot: "/repo",
    });

    expect(commands).toContain("git checkout azure_core_infra-branch");
    expect(
      commands.indexOf("git checkout azure_core_infra-branch"),
    ).toBeLessThan(
      commands.indexOf(
        "git merge --allow-unrelated-histories -s ours --no-edit pagopa-dx-terraform-aws-azure-core-infra/main",
      ),
    );
  });

  it("pushes the split branch directly when the remote main branch does not exist", async () => {
    const commands: string[] = [];
    const git$ = vi.fn(
      async (strings: TemplateStringsArray, ...values: string[]) => {
        commands.push(String.raw({ raw: strings }, ...values));
      },
    );

    githubMocks.ensureGitHubRepository.mockResolvedValue({
      created: true,
      owner: "pagopa-dx",
      repo: "terraform-aws-azure-core-infra",
    });
    execaMocks.$.mockReturnValue(git$);
    execaMocks.execa.mockResolvedValue({ exitCode: 2, stderr: "", stdout: "" });

    await publishToGithub({
      description: "Terraform module description",
      githubOwner: "pagopa-dx",
      projectRoot: "infra/modules/azure_core_infra",
      provider: "aws",
      version: "1.2.3",
      workspaceRoot: "/repo",
    });

    expect(githubMocks.ensureGitHubRepository).toHaveBeenCalledWith(
      "pagopa-dx",
      "terraform-aws-azure-core-infra",
    );
    expect(execaMocks.$).toHaveBeenCalledWith({
      cwd: "/repo",
    });
    expect(execaMocks.execa).toHaveBeenCalledWith(
      "git",
      [
        "ls-remote",
        "--exit-code",
        "--heads",
        "pagopa-dx-terraform-aws-azure-core-infra",
        "refs/heads/main",
      ],
      { cwd: "/repo", reject: false },
    );
    expect(commands).toEqual([
      "git remote add pagopa-dx-terraform-aws-azure-core-infra https://github.com/pagopa-dx/terraform-aws-azure-core-infra.git",
      "git subtree split --prefix=infra/modules/azure_core_infra -b azure_core_infra-branch",
      "git push pagopa-dx-terraform-aws-azure-core-infra azure_core_infra-branch:main",
    ]);
  });

  it("throws when checking the remote main branch fails unexpectedly", async () => {
    const commands: string[] = [];
    const git$ = vi.fn(
      async (strings: TemplateStringsArray, ...values: string[]) => {
        commands.push(String.raw({ raw: strings }, ...values));
      },
    );

    githubMocks.ensureGitHubRepository.mockResolvedValue({
      created: false,
      owner: "pagopa-dx",
      repo: "terraform-aws-azure-core-infra",
    });
    execaMocks.$.mockReturnValue(git$);
    execaMocks.execa.mockResolvedValue({
      exitCode: 128,
      stderr: "fatal: unable to access remote",
      stdout: "",
    });

    await expect(
      publishToGithub({
        description: "Terraform module description",
        githubOwner: "pagopa-dx",
        projectRoot: "infra/modules/azure_core_infra",
        provider: "aws",
        version: "1.2.3",
        workspaceRoot: "/repo",
      }),
    ).rejects.toThrow();

    expect(commands).toEqual([
      "git remote add pagopa-dx-terraform-aws-azure-core-infra https://github.com/pagopa-dx/terraform-aws-azure-core-infra.git",
      "git subtree split --prefix=infra/modules/azure_core_infra -b azure_core_infra-branch",
    ]);
  });
});
