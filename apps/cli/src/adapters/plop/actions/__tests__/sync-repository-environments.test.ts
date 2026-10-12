/**
 * Unit tests for keeping repository Terraform environments in sync.
 */
import { execa } from "execa";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Language } from "web-tree-sitter";

import type { Payload } from "../../generators/environment/prompts.js";

import { getPayload } from "../../generators/environment/__tests__/fixtures.js";
import { updateRepositoryEnvironmentsHcl } from "../../../terraform/hcl-repository-environments.js";
import { syncRepositoryEnvironments } from "../sync-repository-environments.js";

const terraformCommand = vi.hoisted(() => vi.fn(async () => undefined));
const terraformValidator = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("../../../execa/terraform.js", () => ({
  tf$: vi.fn(() => terraformCommand),
  validateTerraformSource: terraformValidator,
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
  repositoryState: {
    destination: {
      backend: {
        resourceGroupName: "state-rg",
        storageAccountName: "statest",
        subscriptionId: "test-subscription",
        type: "azurerm",
      },
      containerName: "terraform-state",
      key: "dx/payments/repository.tfstate",
    },
    status: "remote-verified",
  },
  tags: {
    CostCenter: "TS000 - TECNOLOGIA & SERVIZI",
    Owner: "DX Platform",
  },
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

describe("repository state verification", () => {
  it("refuses to update GitHub environments before remote state verification", async () => {
    await expect(syncRepositoryEnvironments(getPayload())).rejects.toThrow(
      "Repository state has not been verified remotely",
    );
  });
});

describe("updateRepositoryEnvironmentsHcl", () => {
  it("retries loading the HCL grammar after a transient failure", async () => {
    const loadLanguage = vi
      .spyOn(Language, "load")
      .mockRejectedValueOnce(new Error("temporary grammar load failure"));
    try {
      await expect(
        updateRepositoryEnvironmentsHcl(repositoryConfig, "dev"),
      ).rejects.toThrow(/HCL parser/);
      await expect(
        updateRepositoryEnvironmentsHcl(repositoryConfig, "dev"),
      ).resolves.toContain('    environments           = ["dev", "prod"]');
      expect(loadLanguage).toHaveBeenCalledTimes(2);
    } finally {
      loadLanguage.mockRestore();
    }
  });

  it("adds a non-prod environment while preserving the implicit prod default", async () => {
    const result = await updateRepositoryEnvironmentsHcl(
      repositoryConfig,
      "dev",
    );

    expect(result).toContain('    environments           = ["dev", "prod"]');
  });

  it.each(["github_repository", '"github_\\u0072epository"'])(
    "recognizes an equivalent repository module label: %s",
    async (label) => {
      const content = repositoryConfig.replace('"github_repository"', label);

      const result = await updateRepositoryEnvironmentsHcl(content, "dev");

      expect(result).toContain(`module ${label} {`);
      expect(result).toContain('    environments           = ["dev", "prod"]');
    },
  );

  it("does not add an explicit environments property when prod is already implicit", async () => {
    const result = await updateRepositoryEnvironmentsHcl(
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

    const result = await updateRepositoryEnvironmentsHcl(content, "uat");

    expect(result).toContain('    environments           = ["uat", "prod"]');
  });

  it("adds a tenant-qualified environment while preserving the implicit prod default", async () => {
    const result = await updateRepositoryEnvironmentsHcl(
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

    const result = await updateRepositoryEnvironmentsHcl(content, "dev");

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
      updateRepositoryEnvironmentsHcl(content, "uat"),
    ).rejects.toThrow(/github_repository/);
  });

  it("is idempotent when the selected environment already exists", async () => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []\n",
      '    reviewers_teams        = []\n    environments           = ["dev", "prod"]\n',
    );

    const result = await updateRepositoryEnvironmentsHcl(content, "dev");

    expect(result).toBe(content);
  });
});

describe("structural repository HCL updates", () => {
  it("rejects a missing repository module", async () => {
    await expect(async () =>
      updateRepositoryEnvironmentsHcl('resource "x" "y" {}', "dev"),
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

    const result = await updateRepositoryEnvironmentsHcl(content, "dev");

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

    const result = await updateRepositoryEnvironmentsHcl(content, "dev");

    expect(result).toContain('name = "my-project", topics = ["test"]');
    expect(result).toContain('environments = ["dev", "prod"]');
    await expect(updateRepositoryEnvironmentsHcl(result, "dev")).resolves.toBe(
      result,
    );
  });

  it("supports literal quoted repository keys", async () => {
    const content = repositoryConfig.replace(
      '    name                   = "my-project"',
      '    "name"                 = "my-project"',
    );

    const result = await updateRepositoryEnvironmentsHcl(content, "dev");

    expect(result).toContain('    "name"                 = "my-project"');
    expect(result).toContain('    environments           = ["dev", "prod"]');
  });

  it("detects duplicate quoted and unquoted repository keys after decoding", async () => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []",
      '    reviewers_teams        = []\n    "na\\u006de" = "duplicate"',
    );

    await expect(
      updateRepositoryEnvironmentsHcl(content, "dev"),
    ).rejects.toThrow(/Duplicate repository property "name"/);
  });

  it("rejects commented environment lists when an addition is needed", async () => {
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

    await expect(
      updateRepositoryEnvironmentsHcl(content, "dev"),
    ).rejects.toThrow("Move comments outside the list");
  });

  it("leaves a commented list unchanged when both selected and prod environments exist", async () => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []\n",
      [
        "    reviewers_teams        = []",
        "    environments = [",
        '      "dev",',
        "      # production protection",
        '      "prod",',
        "    ]",
        "",
      ].join("\n"),
    );

    const result = await updateRepositoryEnvironmentsHcl(content, "dev");

    expect(result).toBe(content);
  });

  it("preserves comments outside an updated environment list", async () => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []\n",
      [
        '    reviewers_teams        = ["]"] # keep reviewers',
        '    environments = ["prod"] # keep list',
        "",
      ].join("\n"),
    );

    const result = await updateRepositoryEnvironmentsHcl(content, "dev");

    expect(result).toContain('reviewers_teams        = ["]"] # keep reviewers');
    expect(result).toContain('environments = ["dev", "prod"] # keep list');
  });

  it.each(["[]", '["prod",]', '[\n      "prod",\n    ]'])(
    "normalizes an uncommented literal list when adding an environment: %s",
    async (list) => {
      const content = repositoryConfig.replace(
        "    reviewers_teams        = []\n",
        `    reviewers_teams        = []\n    environments = ${list}\n`,
      );
      const expected = repositoryConfig.replace(
        "    reviewers_teams        = []\n",
        '    reviewers_teams        = []\n    environments = ["dev", "prod"]\n',
      );

      const result = await updateRepositoryEnvironmentsHcl(content, "dev");

      expect(result).toBe(expected);
      await expect(
        updateRepositoryEnvironmentsHcl(result, "dev"),
      ).resolves.toBe(result);
    },
  );

  it("rejects block comments in an empty environment list", async () => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []\n",
      "    reviewers_teams        = []\n    environments = [/* reserved */]\n",
    );

    await expect(
      updateRepositoryEnvironmentsHcl(content, "dev"),
    ).rejects.toThrow("Move comments outside the list");
  });

  it("preserves unrelated HCL containing braces and HCL-like strings", async () => {
    const unrelated = [
      "locals {",
      '  example = "repository = { environments = [\\"other\\"] }"',
      '  settings = { nested = { marker = "}" } }',
      "}",
      "",
    ].join("\n");

    const result = await updateRepositoryEnvironmentsHcl(
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

    const result = await updateRepositoryEnvironmentsHcl(
      unrelated + repositoryConfig,
      "dev",
    );

    expect(result.startsWith(unrelated)).toBe(true);
    expect(result).toContain('    environments           = ["dev", "prod"]');
  });

  it("preserves CRLF and Unicode outside the edited range", async () => {
    const content = `# Caffè 😀\r\n${repositoryConfig.replaceAll("\n", "\r\n")}`;

    const result = await updateRepositoryEnvironmentsHcl(content, "dev");

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
      updateRepositoryEnvironmentsHcl(content, "dev"),
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
      updateRepositoryEnvironmentsHcl(content, "uat"),
    ).rejects.toThrow(/environments/);
  });

  it("rejects a repository object followed by an attribute traversal", async () => {
    const content = [
      'module "github_repository" {',
      '  repository = { selected = { name = "my-project" } }.selected',
      "}",
      "",
    ].join("\n");

    await expect(
      updateRepositoryEnvironmentsHcl(content, "dev"),
    ).rejects.toThrow(/repository/);
  });

  it.each([
    'environments = ["prod"][var.index]',
    'environments = ["prod"[var.index]]',
  ])("rejects indexed environment expressions: %s", async (attribute) => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []",
      `    reviewers_teams        = []\n    ${attribute}`,
    );

    await expect(
      updateRepositoryEnvironmentsHcl(content, "uat"),
    ).rejects.toThrow(/environments/);
  });

  it("rejects repeated environment names", async () => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []",
      '    reviewers_teams        = []\n    environments = ["dev", "dev", "prod"]',
    );

    await expect(async () =>
      updateRepositoryEnvironmentsHcl(content, "dev"),
    ).rejects.toThrow(/environments/);
  });

  it.each([
    '"github_repository"',
    "github_repository",
    '"github_\\u0072epository"',
  ])("rejects duplicate repository modules with label %s", async (label) => {
    const duplicate = repositoryConfig.replace('"github_repository"', label);

    await expect(
      updateRepositoryEnvironmentsHcl(repositoryConfig + duplicate, "dev"),
    ).rejects.toThrow(/github_repository/);
  });

  it.each(['"extra"', "extra"])(
    "rejects an extra repository module label: %s",
    async (label) => {
      const content = repositoryConfig.replace(
        'module "github_repository" {',
        `module "github_repository" ${label} {`,
      );

      await expect(
        updateRepositoryEnvironmentsHcl(content, "dev"),
      ).rejects.toThrow(/github_repository/);
    },
  );

  it("rejects duplicate environments attributes", async () => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []",
      '    reviewers_teams        = []\n    environments = ["dev"]\n    environments = ["prod"]',
    );

    await expect(async () =>
      updateRepositoryEnvironmentsHcl(content, "uat"),
    ).rejects.toThrow(/environments/);
  });
});

describe("repository module label validation", () => {
  beforeEach(() => {
    terraformCommand.mockClear();
    terraformValidator.mockReset();
    terraformValidator.mockResolvedValue(undefined);
  });

  it.each([
    { duplicate: true, header: "module github_repository {" },
    { duplicate: true, header: 'module "github_\\u0072epository" {' },
    { duplicate: true, header: 'module "github_\\U00000072epository" {' },
    { duplicate: false, header: 'module "github_repository" extra {' },
  ])(
    "rejects $header without changing main.tf",
    async ({ duplicate, header }) => {
      const module = repositoryConfig.replace(
        'module "github_repository" {',
        header,
      );
      const content = duplicate ? repositoryConfig + module : module;

      await inTemporaryRepository(
        content,
        async (mainFile, repositoryDirectory) => {
          await expect(syncRepositoryEnvironments(payload)).rejects.toThrow(
            /module/,
          );
          await expect(fs.readFile(mainFile)).resolves.toEqual(
            Buffer.from(content),
          );
          await expect(fs.readdir(repositoryDirectory)).resolves.toEqual([
            "main.tf",
          ]);
          expect(terraformValidator).not.toHaveBeenCalled();
          expect(terraformCommand).not.toHaveBeenCalled();
        },
      );
    },
  );
});

describe("syncRepositoryEnvironments", () => {
  beforeEach(() => {
    terraformCommand.mockClear();
    terraformValidator.mockReset();
    terraformValidator.mockResolvedValue(undefined);
  });

  it("does not validate unchanged repository HCL", async () => {
    await inTemporaryRepository(repositoryConfig, async (mainFile) => {
      await syncRepositoryEnvironments({
        ...payload,
        env: { ...payload.env, name: "prod" },
      });

      expect(terraformValidator).not.toHaveBeenCalled();
      await expect(fs.readFile(mainFile, "utf8")).resolves.toBe(
        repositoryConfig,
      );
      expect(terraformCommand).toHaveBeenCalledTimes(2);
    });
  });

  it("reports a missing repository file when its directory is absent", async () => {
    await inTemporaryRepository(repositoryConfig, async (mainFile) => {
      const repositoryDirectory = path.dirname(mainFile);
      await fs.rename(repositoryDirectory, `${repositoryDirectory}-saved`);

      await expect(syncRepositoryEnvironments(payload)).rejects.toThrow(
        "infra/repository/main.tf does not exist or is not readable",
      );
      expect(terraformValidator).not.toHaveBeenCalled();
      expect(terraformCommand).not.toHaveBeenCalled();
      await expect(
        fs.readdir(path.dirname(repositoryDirectory)),
      ).resolves.toEqual(["repository-saved"]);
    });
  });

  it.each([
    'environments = concat(["dev"], ["prod"])',
    'environments = ["prod" /* keep production */]',
  ])(
    "leaves main.tf untouched and does not apply Terraform on unsupported input: %s",
    async (attribute) => {
      const content = repositoryConfig.replace(
        "    reviewers_teams        = []",
        `    reviewers_teams        = []\n    ${attribute}`,
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
    },
  );

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
    terraformValidator.mockRejectedValueOnce(formatterError);

    await inTemporaryRepository(
      repositoryConfig,
      async (mainFile, directory) => {
        await expect(syncRepositoryEnvironments(payload)).rejects.toBe(
          formatterError,
        );
        await expect(fs.readFile(mainFile, "utf8")).resolves.toBe(
          repositoryConfig,
        );
        await expect(fs.readdir(directory)).resolves.toEqual(["main.tf"]);
        expect(terraformValidator).toHaveBeenCalledExactlyOnceWith(
          expect.stringContaining('environments           = ["dev", "prod"]'),
          "infra/repository/main.tf",
        );
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
        expect(terraformValidator).toHaveBeenCalledTimes(1);
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
      terraformValidator.mockClear();

      await syncRepositoryEnvironments(payload);

      await expect(fs.readFile(mainFile, "utf8")).resolves.toBe(first);
      const secondStat = await fs.stat(mainFile);
      expect(secondStat.ino).toBe(firstStat.ino);
      expect(secondStat.mtimeMs).toBe(firstStat.mtimeMs);
      expect(terraformValidator).not.toHaveBeenCalled();
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

describe("repository configuration reading", () => {
  beforeEach(() => {
    terraformCommand.mockClear();
    terraformValidator.mockReset();
    terraformValidator.mockResolvedValue(undefined);
  });

  it.skipIf(process.platform === "win32")(
    "rejects a FIFO without blocking or running Terraform",
    async () => {
      await inTemporaryRepository(repositoryConfig, async (mainFile) => {
        await fs.unlink(mainFile);
        await execa("mkfifo", [mainFile]);

        await expect(syncRepositoryEnvironments(payload)).rejects.toThrow(
          /expected a regular file/,
        );
        expect(terraformValidator).not.toHaveBeenCalled();
        expect(terraformCommand).not.toHaveBeenCalled();
      });
    },
  );

  it("does not read a replacement symlink after checking the repository file", async () => {
    const invalidConfig = repositoryConfig.replace(
      "    reviewers_teams        = []",
      '    reviewers_teams        = ["missing bracket"',
    );

    await inTemporaryRepository(invalidConfig, async (mainFile, directory) => {
      const replacementFile = path.join(directory, "replacement.tf");
      await fs.writeFile(replacementFile, repositoryConfig);
      const lstat = fs.lstat.bind(fs);
      const pathCheck = vi
        .spyOn(fs, "lstat")
        .mockImplementationOnce(async () => {
          const info = await lstat(mainFile);
          await fs.rename(mainFile, path.join(directory, "original.tf"));
          await fs.symlink(replacementFile, mainFile);
          return info;
        });

      try {
        await expect(
          syncRepositoryEnvironments({
            ...payload,
            env: { ...payload.env, name: "prod" },
          }),
        ).rejects.toThrow(/Invalid HCL/);
        expect(terraformValidator).not.toHaveBeenCalled();
        expect(terraformCommand).not.toHaveBeenCalled();
      } finally {
        pathCheck.mockRestore();
      }
      await expect(fs.readFile(replacementFile, "utf8")).resolves.toBe(
        repositoryConfig,
      );
    });
  });

  it.each<Payload["env"]["name"]>(["dev", "prod"])(
    "rejects a symlinked main.tf before Terraform runs for %s",
    async (name) => {
      await inTemporaryRepository(
        repositoryConfig,
        async (mainFile, directory) => {
          const targetFile = path.join(directory, "target.tf");
          await fs.rename(mainFile, targetFile);
          await fs.symlink(targetFile, mainFile);

          await expect(
            syncRepositoryEnvironments({
              ...payload,
              env: { ...payload.env, name },
            }),
          ).rejects.toThrow(/expected a regular file/);

          expect((await fs.lstat(mainFile)).isSymbolicLink()).toBe(true);
          await expect(fs.readFile(targetFile, "utf8")).resolves.toBe(
            repositoryConfig,
          );
          expect(terraformValidator).not.toHaveBeenCalled();
          expect(terraformCommand).not.toHaveBeenCalled();
        },
      );
    },
  );

  it("preserves UTF-8 source outside the edited environment list", async () => {
    const content = `# ${"x".repeat(64 * 1024 - 3)}\u00e9\n${repositoryConfig}`;
    const expected = content.replace(
      "    reviewers_teams        = []\n",
      '    reviewers_teams        = []\n    environments           = ["dev", "prod"]\n',
    );

    await inTemporaryRepository(content, async (mainFile) => {
      await syncRepositoryEnvironments(payload);

      await expect(fs.readFile(mainFile)).resolves.toEqual(
        Buffer.from(expected),
      );
    });
  });

  it("rejects invalid UTF-8 without replacing main.tf", async () => {
    const content = Buffer.concat([
      Buffer.from("# invalid byte sequence: "),
      Buffer.from([0xc3, 0x28]),
      Buffer.from(`\n${repositoryConfig}`),
    ]);

    await inTemporaryRepository(
      repositoryConfig,
      async (mainFile, repositoryDirectory) => {
        await fs.writeFile(mainFile, content);

        await expect(syncRepositoryEnvironments(payload)).rejects.toThrow(
          /Cannot safely read/,
        );

        await expect(fs.readFile(mainFile)).resolves.toEqual(content);
        await expect(fs.readdir(repositoryDirectory)).resolves.toEqual([
          "main.tf",
        ]);
        expect(terraformValidator).not.toHaveBeenCalled();
        expect(terraformCommand).not.toHaveBeenCalled();
      },
    );
  });

  it("preserves a UTF-8 BOM when replacing main.tf", async () => {
    const content = `\uFEFF${repositoryConfig}`;

    await inTemporaryRepository(content, async (mainFile) => {
      await syncRepositoryEnvironments(payload);

      const updated = await fs.readFile(mainFile);
      expect(updated.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
      expect(updated.toString("utf8")).toContain(
        '    environments           = ["dev", "prod"]',
      );
    });
  });
});
