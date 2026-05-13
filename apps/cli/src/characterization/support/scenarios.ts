/**
 * Scenario runner for dx-cli characterization suites.
 * It owns local emulators, deterministic normalization, and record/verify execution.
 */

import { $ } from "execa";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import semverParse from "semver/functions/parse.js";

import type { FetchGitHubReleaseFn } from "../../adapters/plop/actions/fetch-github-release.js";
import type { SetupPnpmAction } from "../../adapters/plop/actions/setup-pnpm.js";
import type { Payload as EnvironmentPayload } from "../../adapters/plop/generators/environment/index.js";
import type { Payload as MonorepoPayload } from "../../adapters/plop/generators/monorepo/index.js";

import {
  addEnvironmentAction,
  type AddEnvironmentActionOptions,
} from "../../adapters/commander/commands/add.js";
import {
  checkInitPreconditions,
  initAction,
  type InitActionOptions,
} from "../../adapters/commander/commands/init.js";
import { Repository } from "../../domain/github.js";
import {
  assertCassetteMatches,
  type ScenarioCassette,
  type ScenarioName,
  writeCassette,
} from "./cassettes.js";
import {
  AuthorizationServiceEmulator,
  CloudAccountRepositoryEmulator,
  CloudAccountServiceEmulator,
  ensureDirectory,
  GitHubServiceEmulator,
} from "./emulators.js";

type CharacterizationMode = "record" | "verify";

const pinnedVersions = {
  devcontainersCli: "0.86.0",
  node: "24.14.1",
  nx: "22.7.1",
  pnpm: "10.33.0",
  preCommitTerraform: "1.105.0",
  terraform: "1.15.2",
} as const;

const parseSemver = (version: string) => {
  const parsed = semverParse(version, {}, true);

  return parsed
    ? okAsync(parsed)
    : errAsync(new Error(`Invalid semver version: ${version}`));
};

const fixedGitHubRelease: FetchGitHubReleaseFn = (repository) => {
  const versionByRepository: Record<string, string> = {
    "pre-commit-terraform": pinnedVersions.preCommitTerraform,
    terraform: pinnedVersions.terraform,
  };

  return () => {
    const version = versionByRepository[repository.name];

    return version
      ? parseSemver(version)
      : errAsync(
          new Error(
            `No characterization release version configured for ${repository.owner}/${repository.name}`,
          ),
        );
  };
};

const fixedNodeVersion = () => parseSemver(pinnedVersions.node);

const createPinnedSetupPnpmAction = (): SetupPnpmAction => async (payload) => {
  const cwd = path.resolve(payload.repoName);
  const env = Object.fromEntries(
    Object.entries(process.env)
      .filter(([key]) => !key.startsWith("npm_config_"))
      .concat([
        ["CI", "1"],
        ["COREPACK_ENABLE_DOWNLOAD_PROMPT", "0"],
        ["NPM_CONFIG_FUND", "false"],
        ["NPM_CONFIG_UPDATE_NOTIFIER", "false"],
      ]),
  );
  const command = $({
    cwd,
    env,
    extendEnv: false,
    shell: true,
  });

  await command`corepack enable`;
  await command`corepack use pnpm@${pinnedVersions.pnpm}`;
  await command`npx --yes nx@${pinnedVersions.nx} init --interactive=false --aiAgents=copilot`;
  await command`pnpm -w add -D @devcontainers/cli@${pinnedVersions.devcontainersCli} @nx/js@${pinnedVersions.nx} @nx/eslint@${pinnedVersions.nx} @nx/vitest@${pinnedVersions.nx}`;
  await command`pnpm devcontainer templates apply -t ghcr.io/pagopa/devcontainer-templates/node:1`;

  return "Monorepo bootstrapped";
};

const pathExists = async (value: string): Promise<boolean> => {
  try {
    await stat(value);
    return true;
  } catch {
    return false;
  }
};

const listRelativeFiles = async (root: string): Promise<string[]> => {
  const walk = async (directory: string): Promise<string[]> => {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          return walk(entryPath);
        }

        return [entryPath];
      }),
    );

    return nested.flat();
  };

  if (!(await pathExists(root))) {
    return [];
  }

  const files = await walk(root);

  return files
    .map((filePath) => path.relative(root, filePath))
    .sort((left, right) => left.localeCompare(right));
};

const normalizeString = (
  value: string,
  replacements: [string, string][],
): string =>
  replacements.reduce(
    (current, [from, to]) => current.split(from).join(to),
    value.replace(/\r\n/g, "\n"),
  );

const normalizeValue = <T>(value: T, replacements: [string, string][]): T => {
  if (typeof value === "string") {
    return normalizeString(value, replacements) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item, replacements)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        normalizeValue(nested, replacements),
      ]),
    ) as T;
  }

  return value;
};

const withEnvironment = async <T>(
  overrides: Record<string, string>,
  run: () => Promise<T>,
): Promise<T> => {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    process.env[key] = value;
  }

  try {
    return await run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        Reflect.deleteProperty(process.env, key);
      } else {
        process.env[key] = value;
      }
    }
  }
};

const withWorkingDirectory = async <T>(
  cwd: string,
  run: () => Promise<T>,
): Promise<T> => {
  const originalCwd = process.cwd();
  process.chdir(cwd);

  try {
    return await run();
  } finally {
    process.chdir(originalCwd);
  }
};

const createLocalRepositoryTerraformConfig = async (
  repoRoot: string,
  remoteRoot: string,
  payload: MonorepoPayload,
): Promise<void> => {
  const ownerRoot = path.join(remoteRoot, payload.repoOwner);
  const remoteRepoPath = path.join(ownerRoot, `${payload.repoName}.git`);
  const repositoryConfigRoot = path.join(repoRoot, "infra", "repository");
  const bootstrapScript = [
    "set -euo pipefail",
    `owner_root=${JSON.stringify(ownerRoot)}`,
    `remote_repo_path=${JSON.stringify(remoteRepoPath)}`,
    'mkdir -p "$owner_root"',
    'if [ ! -d "$remote_repo_path" ]; then',
    '  git init --bare "$remote_repo_path"',
    '  temp_dir="$(mktemp -d)"',
    '  git -C "$temp_dir" init -b main',
    `  printf '%s\\n' '# ${payload.repoName}' > "$temp_dir/README.md"`,
    '  git -C "$temp_dir" add README.md',
    '  git -C "$temp_dir" -c user.name="DX CLI Characterization" -c user.email="dx-cli@example.invalid" commit -m "Initial commit"',
    '  git -C "$temp_dir" remote add origin "$remote_repo_path"',
    '  git -C "$temp_dir" push origin main',
    '  rm -rf "$temp_dir"',
    "fi",
  ].join("\n");

  await ensureDirectory(repositoryConfigRoot);
  await writeFile(
    path.join(repositoryConfigRoot, "providers.tf"),
    `terraform {\n  required_version = ">= ${pinnedVersions.terraform}"\n}\n`,
  );
  await writeFile(
    path.join(repositoryConfigRoot, "main.tf"),
    [
      'resource "terraform_data" "repository" {',
      '  input = "characterization"',
      '  provisioner "local-exec" {',
      '    interpreter = ["/bin/bash", "-lc"]',
      "    command = <<-EOT",
      bootstrapScript,
      "EOT",
      "  }",
      "}",
      "",
    ].join("\n"),
  );
  await writeFile(
    path.join(repositoryConfigRoot, "outputs.tf"),
    "// Characterization harness replaces GitHub outputs with local filesystem git state.\n",
  );
};

const buildNormalization = (
  harnessRoot: string,
  workspaceRoot: string,
  remoteRoot: string,
): ScenarioCassette["normalization"] => {
  const gitRemoteBaseUrl = pathToFileURL(remoteRoot).href.replace(/\/$/, "");

  return {
    placeholders: {
      "<git-remote-base-url>": gitRemoteBaseUrl,
      "<git-remote-root>": remoteRoot,
      "<harness-root>": harnessRoot,
      "<workspace-root>": workspaceRoot,
    },
    redactions: {
      GH_APP_KEY: "<redacted-gh-app-key>",
    },
  };
};

const normalizeCassette = (
  cassette: ScenarioCassette,
  normalization: ScenarioCassette["normalization"],
): ScenarioCassette => {
  const replacements = Object.entries(
    normalization.placeholders as Record<string, string>,
  ).map(([placeholder, value]) => [value, placeholder] as [string, string]);

  return normalizeValue(cassette, replacements);
};

const collectGitHistory = async (repositoryPath: string) => {
  const branches = (
    await $`git --git-dir=${repositoryPath} for-each-ref --format=%(refname:short) refs/heads`
  ).stdout
    .split("\n")
    .map((branch) => branch.trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
  const commits = (
    await $`git --git-dir=${repositoryPath} log --format=%s --all`
  ).stdout
    .split("\n")
    .map((commit) => commit.trim())
    .filter(Boolean);

  return { branches, commits };
};

const buildInitPublishCassette = async (): Promise<ScenarioCassette> => {
  const promptAnswers: MonorepoPayload = {
    repoDescription: "Characterization workspace for dx init",
    repoName: "eng-char-dx-init",
    repoOwner: "pagopa",
  };
  const harnessRoot = await mkdtemp(
    path.join(os.tmpdir(), "dx-cli-init-char-"),
  );
  const remoteRoot = path.join(harnessRoot, "git-remotes");
  const workspaceRoot = path.join(harnessRoot, "workspace");
  const gitRemoteBaseUrl = pathToFileURL(remoteRoot).href.replace(/\/$/, "");
  const gitHubService = new GitHubServiceEmulator(remoteRoot, gitRemoteBaseUrl);

  await ensureDirectory(remoteRoot);
  await ensureDirectory(workspaceRoot);

  const initOptions: InitActionOptions = {
    confirmGitHubRepoCreation: () => okAsync(true),
    generator: {
      promptAnswers,
      setup: {
        fetchGitHubRelease: fixedGitHubRelease,
        fetchNodeVersion: fixedNodeVersion,
        setupPnpm: createPinnedSetupPnpmAction(),
      },
    },
    prepareGitHubPublish: async (payload) =>
      createLocalRepositoryTerraformConfig(
        path.join(workspaceRoot, payload.repoName),
        remoteRoot,
        payload,
      ),
    repositoryFactory: (name, owner) =>
      new Repository(name, owner, gitRemoteBaseUrl),
  };

  const result = await withEnvironment(
    {
      GIT_AUTHOR_EMAIL: "dx-cli@example.invalid",
      GIT_AUTHOR_NAME: "DX CLI Characterization",
      GIT_COMMITTER_EMAIL: "dx-cli@example.invalid",
      GIT_COMMITTER_NAME: "DX CLI Characterization",
      GITHUB_TOKEN: "characterization-token",
    },
    async () =>
      withWorkingDirectory(workspaceRoot, async () => {
        const workflowResult = await initAction({ gitHubService }, initOptions);
        if (workflowResult.isErr()) {
          throw workflowResult.error;
        }
        return workflowResult.value;
      }),
  );

  assert.ok(
    !("gitHubRepoCreationSkipped" in result),
    "The init characterization scenario must publish the repository.",
  );

  const generatedRepoRoot = path.join(workspaceRoot, promptAnswers.repoName);
  const generatedPackageJson = JSON.parse(
    await readFile(path.join(generatedRepoRoot, "package.json"), "utf8"),
  ) as {
    name: string;
    packageManager?: string;
  };
  const remoteRepositoryPath = path.join(
    remoteRoot,
    promptAnswers.repoOwner,
    `${promptAnswers.repoName}.git`,
  );
  const normalization = buildNormalization(
    harnessRoot,
    generatedRepoRoot,
    remoteRoot,
  );

  return normalizeCassette(
    {
      normalization,
      request: {
        command: "dx init",
        confirmGitHubPublish: true,
        pinnedVersions,
        promptAnswers,
      },
      response: {
        pullRequest: result.pr ? { url: result.pr.url } : undefined,
        repository: result.repository
          ? {
              name: result.repository.name,
              owner: result.repository.owner,
              url: result.repository.url,
            }
          : undefined,
      },
      sideEffects: {
        generatedWorkspace: {
          devcontainerPresent: await pathExists(
            path.join(generatedRepoRoot, ".devcontainer", "devcontainer.json"),
          ),
          nodeVersion: (
            await readFile(
              path.join(generatedRepoRoot, ".node-version"),
              "utf8",
            )
          ).trim(),
          packageJson: {
            name: generatedPackageJson.name,
            packageManager: generatedPackageJson.packageManager,
          },
          terraformVersion: (
            await readFile(
              path.join(generatedRepoRoot, ".terraform-version"),
              "utf8",
            )
          ).trim(),
        },
        github: gitHubService.snapshot(),
        gitRemote: await collectGitHistory(remoteRepositoryPath),
      },
      topology: {
        backendStrategy:
          "Local filesystem bare repository created by real terraform apply via terraform_data + local-exec",
        localDependencies: [
          "real corepack",
          "real npx",
          "real pnpm",
          "real terraform",
          "real git",
          "in-process GitHub release emulator",
          "in-process GitHub service emulator",
        ],
        workspaceRoot: generatedRepoRoot,
      },
    },
    normalization,
  );
};

const createWorkspaceFixture = async (workspaceRoot: string): Promise<void> => {
  await ensureDirectory(workspaceRoot);
  await writeFile(
    path.join(workspaceRoot, "package.json"),
    JSON.stringify(
      {
        name: "eng-char-dx-add",
        private: true,
        type: "module",
      },
      null,
      2,
    ),
  );

  const command = $({ cwd: workspaceRoot, shell: true });
  await command`git init`;
};

const checkCharacterizationAddPreconditions = () =>
  checkInitPreconditions().andThen(() =>
    ResultAsync.fromPromise(
      $({ shell: true })`az --version`,
      (cause) =>
        new Error("Azure CLI is required for the characterization precheck.", {
          cause,
        }),
    ).map(() => undefined),
  );

const buildAddEnvironmentInitCassette = async (): Promise<ScenarioCassette> => {
  const cloudAccount = {
    csp: "azure" as const,
    defaultLocation: "italynorth",
    displayName: "PROD-DEVEX",
    id: "sub-prod-devex",
  };
  const promptAnswers: EnvironmentPayload = {
    env: {
      cloudAccounts: [cloudAccount],
      name: "prod",
      prefix: "dx",
    },
    github: {
      owner: "pagopa",
      repo: "eng-char-dx-add",
    },
    init: {
      cloudAccountsToInitialize: [cloudAccount],
      runnerAppCredentials: {
        clientId: "client-char-001",
        id: "app-char-001",
        installationId: "install-char-001",
        key: "-----BEGIN PRIVATE KEY-----\nCHARACTERIZATION-ONLY\n-----END PRIVATE KEY-----\n",
      },
      terraformBackend: {
        cloudAccount,
      },
    },
    tags: {
      BusinessUnit: "DevEx",
      CostCenter: "TS000",
      ManagementTeam: "Platform",
    },
    workspace: {
      domain: "payments",
    },
  };
  const harnessRoot = await mkdtemp(path.join(os.tmpdir(), "dx-cli-add-char-"));
  const workspaceRoot = path.join(harnessRoot, "workspace");
  const gitHubService = new GitHubServiceEmulator(
    path.join(harnessRoot, "unused-remotes"),
    "https://github.local/api",
  );
  const cloudAccountRepository = new CloudAccountRepositoryEmulator([
    cloudAccount,
  ]);
  const cloudAccountService = new CloudAccountServiceEmulator();
  const authorizationService = new AuthorizationServiceEmulator();
  const normalization = buildNormalization(
    harnessRoot,
    workspaceRoot,
    path.join(harnessRoot, "unused-remotes"),
  );
  const addOptions: AddEnvironmentActionOptions = {
    generator: {
      dependencies: {
        cloudAccountRepository,
        cloudAccountService,
      },
      github: promptAnswers.github,
      promptAnswers,
    },
    preconditions: checkCharacterizationAddPreconditions,
  };

  await createWorkspaceFixture(workspaceRoot);

  const result = await withEnvironment(
    {
      GITHUB_TOKEN: "characterization-token",
    },
    async () =>
      withWorkingDirectory(workspaceRoot, async () => {
        const workflowResult = await addEnvironmentAction(
          authorizationService,
          gitHubService,
          addOptions,
        );
        if (workflowResult.isErr()) {
          throw workflowResult.error;
        }
        return workflowResult.value;
      }),
  );

  return normalizeCassette(
    {
      normalization,
      request: {
        azPrecheckStrategy:
          "Real az binary presence check; Azure login itself is emulated because this workflow has no credible local ARM login backend.",
        command: "dx add environment",
        promptAnswers: {
          ...promptAnswers,
          init: {
            ...promptAnswers.init,
            runnerAppCredentials: {
              ...promptAnswers.init?.runnerAppCredentials,
              key: "<redacted-gh-app-key>",
            },
          },
        },
      },
      response: {
        authorizationPrs: result.authorizationPrs.map((authorizationPr) => ({
          url: authorizationPr.url,
        })),
      },
      sideEffects: {
        authorization: authorizationService.snapshot(),
        azure: cloudAccountService.snapshot(),
        generatedFiles: {
          bootstrapper: await listRelativeFiles(
            path.join(workspaceRoot, "infra", "bootstrapper"),
          ),
          core: await listRelativeFiles(
            path.join(workspaceRoot, "infra", "core"),
          ),
          workflows: await listRelativeFiles(
            path.join(workspaceRoot, ".github", "workflows"),
          ),
        },
        github: gitHubService.snapshot(),
      },
      topology: {
        backendStrategy:
          "In-process Azure cloud-account emulator plus GitHub service emulator; no real Azure or GitHub APIs are called.",
        localDependencies: [
          "real terraform",
          "real corepack",
          "real az --version precheck",
          "in-process GitHub service emulator",
          "in-process Azure cloud-account repository emulator",
          "in-process Azure cloud-account service emulator",
          "in-process authorization PR emulator",
        ],
        workspaceRoot,
      },
    },
    normalization,
  );
};

const modeFromEnvironment = (): CharacterizationMode =>
  process.env.DX_CLI_CHARACTERIZATION_MODE === "record" ? "record" : "verify";

const scenarioByName: Record<ScenarioName, () => Promise<ScenarioCassette>> = {
  "dx-add-environment-init": buildAddEnvironmentInitCassette,
  "dx-init-publish": buildInitPublishCassette,
};

export const runCharacterizationScenario = async (
  scenario: ScenarioName,
): Promise<void> => {
  const cassette = await scenarioByName[scenario]();

  if (modeFromEnvironment() === "record") {
    await writeCassette(scenario, cassette);
    return;
  }

  await assertCassetteMatches(scenario, cassette);
};
