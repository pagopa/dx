/**
 * Unit tests for keeping repository Terraform environments in sync.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Payload } from "../../generators/environment/prompts.js";

import {
  syncRepositoryEnvironments,
  syncRepositoryTerraformEnvironments,
} from "../sync-repository-environments.js";

const terraformCommand = vi.hoisted(() => vi.fn(async () => undefined));
const terraformValidator = vi.hoisted(() =>
  vi.fn(async () => ({ stdout: "" })),
);

vi.mock("execa", async (importOriginal) => ({
  ...(await importOriginal<typeof import("execa")>()),
  execa: vi.fn(() => terraformValidator),
}));

vi.mock("../../../execa/terraform.js", () => ({
  tf$: vi.fn(() => terraformCommand),
}));

const repositoryConfig = [
  'module "github_repository" {',
  '  source  = "pagopa-dx/github-environment-bootstrap/github"',
  '  version = "~> 1.0"',
  "",
  "  repository = {",
  '    name                   = "my-project"',
  '    description            = "My project"',
  "    topics                 = []",
  "    reviewers_teams        = []",
  "  }",
  "}",
  "",
].join("\n");

const payload: Payload = {
  env: {
    cloudAccounts: [
      {
        csp: "azure",
        defaultLocation: "italynorth",
        displayName: "DEV-DX",
        id: "test-subscription",
      },
    ],
    name: "dev",
    prefix: "dx",
  },
  github: { owner: "pagopa", repo: "my-project" },
  tags: {},
  workspace: { domain: "payments" },
};

const inTemporaryRepository = async (
  content: string,
  check: (mainFile: string, repositoryDirectory: string) => Promise<void>,
): Promise<void> => {
  const cwd = process.cwd();
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "dx-hcl-sync-"));
  const repositoryDirectory = path.join(directory, "infra", "repository");
  const mainFile = path.join(repositoryDirectory, "main.tf");
  try {
    await fs.mkdir(repositoryDirectory, { recursive: true });
    await fs.writeFile(mainFile, content);
    process.chdir(directory);
    await check(mainFile, repositoryDirectory);
  } finally {
    process.chdir(cwd);
    await fs.rm(directory, { force: true, recursive: true });
  }
};

describe("syncRepositoryTerraformEnvironments", () => {
  it("adds a non-prod environment while preserving the implicit prod default", async () => {
    const result = await syncRepositoryTerraformEnvironments(
      repositoryConfig,
      "dev",
    );

    expect(result).toContain('    environments           = ["dev", "prod"]');
  });

  it("does not add an explicit environments property when prod is already implicit", async () => {
    const result = await syncRepositoryTerraformEnvironments(
      repositoryConfig,
      "prod",
    );

    expect(result).toBe(repositoryConfig);
  });

  it("adds the selected environment to an existing explicit list", async () => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []\n",
      '    reviewers_teams        = []\n    environments           = ["prod"]\n',
    );

    const result = await syncRepositoryTerraformEnvironments(content, "uat");

    expect(result).toContain('    environments           = ["uat", "prod"]');
  });

  it("adds a tenant-qualified environment while preserving the implicit prod default", async () => {
    const result = await syncRepositoryTerraformEnvironments(
      repositoryConfig,
      "ced-prod",
    );

    expect(result).toContain(
      '    environments           = ["prod", "ced-prod"]',
    );
  });

  it("preserves prod when an existing explicit list does not include it", async () => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []\n",
      '    reviewers_teams        = []\n    environments           = ["dev"]\n',
    );

    const result = await syncRepositoryTerraformEnvironments(content, "dev");

    expect(result).toContain('    environments           = ["dev", "prod"]');
  });

  it("rejects a repository attribute outside the generated module", async () => {
    const content = [
      "repository = {",
      '  name                   = "my-project"',
      "  reviewers_teams        = []",
      "}",
      "",
    ].join("\n");

    await expect(async () =>
      syncRepositoryTerraformEnvironments(content, "uat"),
    ).rejects.toThrow(/github_repository/);
  });

  it("is idempotent when the selected environment already exists", async () => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []\n",
      '    reviewers_teams        = []\n    environments           = ["dev", "prod"]\n',
    );

    const result = await syncRepositoryTerraformEnvironments(content, "dev");

    expect(result).toBe(content);
  });
});

describe("structural repository HCL updates", () => {
  it("rejects a missing repository module", async () => {
    await expect(async () =>
      syncRepositoryTerraformEnvironments('resource "x" "y" {}', "dev"),
    ).rejects.toThrow(/github_repository/);
  });

  it("updates only the repository object in the generated module", async () => {
    const unrelated = [
      "locals {",
      "  repository = {",
      '    environments = ["shadow"]',
      "  }",
      "}",
      "",
    ].join("\n");
    const content = unrelated + repositoryConfig;

    const result = await syncRepositoryTerraformEnvironments(content, "dev");

    expect(result.startsWith(unrelated)).toBe(true);
    expect(result).toContain('    environments           = ["dev", "prod"]');
  });

  it("handles a repository object written on one line", async () => {
    const content = [
      'module "github_repository" {',
      '  repository = { name = "my-project", topics = ["test"] }',
      "}",
      "",
    ].join("\n");

    const result = await syncRepositoryTerraformEnvironments(content, "dev");

    expect(result).toContain('name = "my-project", topics = ["test"]');
    expect(result).toContain('environments = ["dev", "prod"]');
    await expect(
      syncRepositoryTerraformEnvironments(result, "dev"),
    ).resolves.toBe(result);
  });

  it("preserves comments in and around an existing environment list", async () => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []\n",
      [
        '    reviewers_teams        = ["]"] # keep reviewers',
        "    environments = [",
        '      "prod", # keep prod',
        "    ] # keep list",
        "",
      ].join("\n"),
    );

    const result = await syncRepositoryTerraformEnvironments(content, "dev");

    expect(result).toContain('reviewers_teams        = ["]"] # keep reviewers');
    expect(result).toContain("# keep prod");
    expect(result).toContain("] # keep list");
    expect(result).toContain('"dev"');
    expect(result.match(/\benvironments\s*=/g)).toHaveLength(1);
    await expect(
      syncRepositoryTerraformEnvironments(result, "dev"),
    ).resolves.toBe(result);
  });

  it("keeps a comment attached to its existing list element", async () => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []\n",
      [
        "    reviewers_teams        = []",
        "    environments = [",
        "      # production protection",
        '      "prod",',
        "    ]",
        "",
      ].join("\n"),
    );

    const result = await syncRepositoryTerraformEnvironments(content, "dev");

    expect(result).toContain(
      '      "dev",\n      # production protection\n      "prod",',
    );
  });

  it("preserves unrelated HCL containing braces and HCL-like strings", async () => {
    const unrelated = [
      "locals {",
      '  example = "repository = { environments = [\\"other\\"] }"',
      '  settings = { nested = { marker = "}" } }',
      "}",
      "",
    ].join("\n");

    const result = await syncRepositoryTerraformEnvironments(
      unrelated + repositoryConfig,
      "ced-prod",
    );

    expect(result.startsWith(unrelated)).toBe(true);
    expect(result).toContain(
      '    environments           = ["prod", "ced-prod"]',
    );
  });

  it("ignores repository syntax inside an unrelated heredoc", async () => {
    const unrelated = [
      "locals {",
      "  example = <<EOT",
      "  repository = {",
      '    environments = ["shadow"]',
      "  }",
      "EOT",
      "}",
      "",
    ].join("\n");

    const result = await syncRepositoryTerraformEnvironments(
      unrelated + repositoryConfig,
      "dev",
    );

    expect(result.startsWith(unrelated)).toBe(true);
    expect(result).toContain('    environments           = ["dev", "prod"]');
  });

  it("preserves CRLF and Unicode outside the edited range", async () => {
    const content = `# Caffè 😀\r\n${repositoryConfig.replaceAll("\n", "\r\n")}`;

    const result = await syncRepositoryTerraformEnvironments(content, "dev");

    expect(result.startsWith("# Caffè 😀\r\n")).toBe(true);
    expect(result.replaceAll("\r\n", "")).not.toContain("\n");
    expect(result).toContain('    environments           = ["dev", "prod"]');
  });
});

describe("repository HCL validation", () => {
  it("rejects invalid HCL syntax even when the target is present", async () => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []",
      '    reviewers_teams        = ["missing bracket"',
    );

    await expect(async () =>
      syncRepositoryTerraformEnvironments(content, "dev"),
    ).rejects.toThrow(/invalid HCL/i);
  });

  it.each([
    'environments = concat(["dev"], ["prod"])',
    'environments = ["${var.environment}"]',
    "environments = [for name in var.environments : name]",
  ])("rejects unsupported environment expressions: %s", async (attribute) => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []",
      `    reviewers_teams        = []\n    ${attribute}`,
    );

    await expect(async () =>
      syncRepositoryTerraformEnvironments(content, "uat"),
    ).rejects.toThrow(/environments/);
  });

  it("rejects repeated environment names", async () => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []",
      '    reviewers_teams        = []\n    environments = ["dev", "dev", "prod"]',
    );

    await expect(async () =>
      syncRepositoryTerraformEnvironments(content, "dev"),
    ).rejects.toThrow(/environments/);
  });

  it("rejects duplicate repository modules", async () => {
    await expect(async () =>
      syncRepositoryTerraformEnvironments(
        repositoryConfig + repositoryConfig,
        "dev",
      ),
    ).rejects.toThrow(/github_repository/);
  });

  it("rejects extra labels on the repository module", async () => {
    const content = repositoryConfig.replace(
      'module "github_repository" {',
      'module "github_repository" "extra" {',
    );

    await expect(async () =>
      syncRepositoryTerraformEnvironments(content, "dev"),
    ).rejects.toThrow(/github_repository/);
  });

  it("rejects duplicate environments attributes", async () => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []",
      '    reviewers_teams        = []\n    environments = ["dev"]\n    environments = ["prod"]',
    );

    await expect(async () =>
      syncRepositoryTerraformEnvironments(content, "uat"),
    ).rejects.toThrow(/environments/);
  });
});

describe("syncRepositoryEnvironments", () => {
  beforeEach(() => {
    terraformCommand.mockClear();
    terraformValidator.mockReset();
    terraformValidator.mockResolvedValue({ stdout: "" });
  });

  it("leaves main.tf untouched and does not apply Terraform on unsupported input", async () => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []",
      '    reviewers_teams        = []\n    environments = concat(["dev"], ["prod"])',
    );

    await inTemporaryRepository(
      content,
      async (mainFile, repositoryDirectory) => {
        await expect(syncRepositoryEnvironments(payload)).rejects.toThrow(
          /environments/,
        );

        await expect(fs.readFile(mainFile, "utf8")).resolves.toBe(content);
        await expect(fs.readdir(repositoryDirectory)).resolves.toEqual([
          "main.tf",
        ]);
        expect(terraformCommand).not.toHaveBeenCalled();
        expect(terraformValidator).not.toHaveBeenCalled();
      },
    );
  });

  it("rejects invalid HCL without replacing main.tf", async () => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []",
      '    reviewers_teams        = ["missing bracket"',
    );

    await inTemporaryRepository(
      content,
      async (mainFile, repositoryDirectory) => {
        await expect(syncRepositoryEnvironments(payload)).rejects.toThrow(
          /invalid HCL/i,
        );
        await expect(fs.readFile(mainFile, "utf8")).resolves.toBe(content);
        await expect(fs.readdir(repositoryDirectory)).resolves.toEqual([
          "main.tf",
        ]);
        expect(terraformValidator).not.toHaveBeenCalled();
        expect(terraformCommand).not.toHaveBeenCalled();
      },
    );
  });

  it("validates the candidate before replacing main.tf", async () => {
    const formatterError = new Error("Terraform rejected the candidate");
    terraformValidator
      .mockResolvedValueOnce({ stdout: "" })
      .mockRejectedValueOnce(formatterError);

    await inTemporaryRepository(
      repositoryConfig,
      async (mainFile, directory) => {
        await expect(syncRepositoryEnvironments(payload)).rejects.toThrow(
          "Cannot validate Terraform HCL",
        );
        await expect(fs.readFile(mainFile, "utf8")).resolves.toBe(
          repositoryConfig,
        );
        await expect(fs.readdir(directory)).resolves.toEqual(["main.tf"]);
        expect(terraformValidator).toHaveBeenCalledTimes(2);
        expect(terraformCommand).not.toHaveBeenCalled();
      },
    );
  });

  it("replaces a valid edit atomically and preserves file permissions", async () => {
    await inTemporaryRepository(
      repositoryConfig,
      async (mainFile, directory) => {
        await fs.chmod(mainFile, 0o640);
        await syncRepositoryEnvironments(payload);

        await expect(fs.readFile(mainFile, "utf8")).resolves.toContain(
          '    environments           = ["dev", "prod"]',
        );
        expect((await fs.stat(mainFile)).mode.toString(8).slice(-3)).toBe(
          "640",
        );
        await expect(fs.readdir(directory)).resolves.toEqual(["main.tf"]);
        expect(terraformValidator).toHaveBeenCalledTimes(2);
        expect(terraformCommand).toHaveBeenCalledTimes(2);
      },
    );
  });

  it("does not rewrite the file when the same environment is added again", async () => {
    await inTemporaryRepository(repositoryConfig, async (mainFile) => {
      await syncRepositoryEnvironments(payload);
      const first = await fs.readFile(mainFile, "utf8");
      const firstStat = await fs.stat(mainFile);
      terraformCommand.mockClear();

      await syncRepositoryEnvironments(payload);

      await expect(fs.readFile(mainFile, "utf8")).resolves.toBe(first);
      const secondStat = await fs.stat(mainFile);
      expect(secondStat.ino).toBe(firstStat.ino);
      expect(secondStat.mtimeMs).toBe(firstStat.mtimeMs);
      expect(terraformCommand).toHaveBeenCalledTimes(2);
    });
  });

  it("cleans up a failed atomic replacement without changing main.tf", async () => {
    await inTemporaryRepository(
      repositoryConfig,
      async (mainFile, directory) => {
        const rename = vi
          .spyOn(fs, "rename")
          .mockRejectedValueOnce(new Error("rename failed"));
        try {
          await expect(syncRepositoryEnvironments(payload)).rejects.toThrow(
            "Cannot safely update infra/repository/main.tf",
          );
        } finally {
          rename.mockRestore();
        }
        await expect(fs.readFile(mainFile, "utf8")).resolves.toBe(
          repositoryConfig,
        );
        await expect(fs.readdir(directory)).resolves.toEqual(["main.tf"]);
        expect(terraformCommand).not.toHaveBeenCalled();
      },
    );
  });
});
