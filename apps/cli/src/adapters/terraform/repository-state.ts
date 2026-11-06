/**
 * Migrate or recover repository state before any GitHub environment apply.
 */
import { execa } from "execa";
import { constants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import type { GitHubRepo } from "../../domain/github-repo.js";
import type {
  RepositoryStateDestination,
  RepositoryStateResult,
  RepositoryStateStorage,
  TerraformState,
} from "../../domain/repository-state.js";

import {
  isEmptyTerraformState,
  parseRepositoryState,
  verifyStateCopy,
} from "../../domain/repository-state.js";
import {
  localMigrationOverride,
  localMigrationOverrideName,
  readOptionalFile,
  readRepositoryBackend,
  verifyInitializedRepositoryBackend,
  writeRepositoryBackend,
} from "./repository-backend.js";
import {
  recoverRepositoryState,
  repositoryRecoveryImportsHeader,
  repositoryRecoveryImportsName,
  type TerraformRunner,
} from "./repository-imports.js";

export const repositoryTerraformRunner =
  (cwd: string, signal?: AbortSignal): TerraformRunner =>
  async (args) => {
    try {
      return await execa("terraform", args, {
        cancelSignal: signal,
        cwd,
        env: {
          NO_COLOR: "1",
          TF_DATA_DIR: path.join(cwd, ".terraform"),
          TF_IN_AUTOMATION: "1",
          TF_INPUT: "0",
        },
      });
    } catch (cause) {
      throw new Error(
        `Terraform ${args[0]} failed during repository state preparation.`,
        { cause },
      );
    }
  };

const localStateFiles = [
  "terraform.tfstate",
  "terraform.tfstate.backup",
  "terraform.tfstate.dx-backup",
];

const readRemoteRepositoryState = (
  content: string | undefined,
  configured: boolean,
  github: GitHubRepo,
): TerraformState | undefined => {
  if (
    content === undefined ||
    (configured && (content.length === 0 || isEmptyTerraformState(content)))
  ) {
    return undefined;
  }
  return parseRepositoryState(content, github);
};

const clearVerifiedLocalState = async (
  repositoryPath: string,
): Promise<void> => {
  const importsPath = path.join(repositoryPath, repositoryRecoveryImportsName);
  const imports = await readOptionalFile(importsPath);
  if (imports?.startsWith(repositoryRecoveryImportsHeader)) {
    await fs.rm(importsPath);
  }
  for (const filename of localStateFiles) {
    await fs.rm(path.join(repositoryPath, filename), { force: true });
  }
};

const assertDefaultWorkspace = async (
  repositoryPath: string,
  run: TerraformRunner,
): Promise<void> => {
  const { stdout } = await run(["workspace", "show"]);
  const workspaces = await fs
    .readdir(path.join(repositoryPath, "terraform.tfstate.d"))
    .catch((cause: unknown) => {
      if (
        cause instanceof Error &&
        "code" in cause &&
        cause.code === "ENOENT"
      ) {
        return [];
      }
      throw new Error("Cannot inspect local repository workspaces.", { cause });
    });
  // init -migrate-state can copy all workspaces, not just the selected one.
  if (stdout.trim() !== "default" || workspaces.length > 0) {
    throw new Error(
      "Automatic repository state migration supports only the default Terraform workspace.",
    );
  }
};

const backUpLocalState = async (
  repositoryPath: string,
  localContent: string,
  localState: TerraformState,
  github: GitHubRepo,
): Promise<void> => {
  const backupPath = path.join(repositoryPath, localStateFiles[2]);
  const previousBackup = await readOptionalFile(backupPath);
  if (previousBackup !== undefined) {
    const backupState = parseRepositoryState(previousBackup, github);
    try {
      verifyStateCopy(backupState, localState);
    } catch (cause) {
      throw new Error(
        "The migration backup conflicts with the current local state.",
        { cause },
      );
    }
  }
  await fs.writeFile(backupPath, localContent, {
    flag: previousBackup === undefined ? "wx" : "w",
    mode: 0o600,
  });
  await fs.chmod(backupPath, 0o600);
  const localPath = path.join(repositoryPath, localStateFiles[0]);
  if ((await readOptionalFile(localPath)) === undefined) {
    await fs.copyFile(backupPath, localPath, constants.COPYFILE_EXCL);
  }
};

const reinitializeLocalState = async (
  repositoryPath: string,
  run: TerraformRunner,
): Promise<void> => {
  // An interrupted init may leave .terraform pointing at an empty remote
  // backend. Re-establish the validated local source before retrying migration.
  const overridePath = path.join(repositoryPath, localMigrationOverrideName);
  const override = await readOptionalFile(overridePath);
  if (override !== undefined && override !== localMigrationOverride) {
    throw new Error(
      "Repository migration override already exists with unexpected contents.",
    );
  }
  await fs.writeFile(overridePath, localMigrationOverride, { mode: 0o600 });
  try {
    await run(["init", "-reconfigure", "-input=false"]);
  } finally {
    await fs.rm(overridePath);
  }
};

export const prepareRepositoryState = async ({
  destination,
  github,
  recover = recoverRepositoryState,
  repositoryPath,
  run,
  storage,
}: {
  destination: RepositoryStateDestination;
  github: GitHubRepo;
  recover?: typeof recoverRepositoryState;
  repositoryPath: string;
  run?: TerraformRunner;
  storage: RepositoryStateStorage;
}): Promise<RepositoryStateResult> => {
  try {
    await assertDefaultWorkspace(
      repositoryPath,
      run ?? repositoryTerraformRunner(repositoryPath),
    );
    const result = await storage.withLock(destination, async (signal) => {
      const execute = run ?? repositoryTerraformRunner(repositoryPath, signal);
      const configured = await readRepositoryBackend(repositoryPath);
      if (configured && !isDeepStrictEqual(configured, destination)) {
        throw new Error(
          "The repository backend changed after confirmation; refusing to relocate state.",
        );
      }
      const localPath = path.join(repositoryPath, localStateFiles[0]);
      const backupPath = path.join(repositoryPath, localStateFiles[2]);
      const backupContent = await readOptionalFile(backupPath);
      const backupState =
        backupContent === undefined
          ? undefined
          : parseRepositoryState(backupContent, github);
      const localContent = (await readOptionalFile(localPath)) ?? backupContent;
      const localState =
        localContent === undefined
          ? undefined
          : parseRepositoryState(localContent, github);
      const remoteContent = await storage.read(destination);
      const remoteState = readRemoteRepositoryState(
        remoteContent,
        configured !== undefined,
        github,
      );

      if (remoteState) {
        if (!configured) {
          throw new Error(
            "The destination already contains repository state; refusing to adopt or overwrite it without a configured backend.",
          );
        }
        if (localState) {
          verifyStateCopy(localState, remoteState);
        }
        if (backupState) {
          verifyStateCopy(backupState, remoteState);
        }
        await execute(["init", "-reconfigure", "-input=false"]);
        await verifyInitializedRepositoryBackend(repositoryPath, destination);
        if (
          (await readOptionalFile(
            path.join(repositoryPath, repositoryRecoveryImportsName),
          )) !== undefined
        ) {
          await recover(repositoryPath, github, execute);
        }
      } else if (localState && localContent !== undefined) {
        await backUpLocalState(
          repositoryPath,
          localContent,
          localState,
          github,
        );
        await reinitializeLocalState(repositoryPath, execute);
        if (!configured) {
          await writeRepositoryBackend(repositoryPath, destination);
        }
        await execute([
          "init",
          "-migrate-state",
          "-force-copy",
          "-input=false",
        ]);
      } else {
        if (!configured) {
          await writeRepositoryBackend(repositoryPath, destination);
        }
        await execute(["init", "-reconfigure", "-input=false"]);
        await verifyInitializedRepositoryBackend(repositoryPath, destination);
        await recover(repositoryPath, github, execute);
      }

      const verifiedContent = await storage.read(destination);
      if (verifiedContent === undefined) {
        throw new Error(
          "Remote repository state is missing after migration or recovery.",
        );
      }
      const verifiedState = parseRepositoryState(verifiedContent, github);
      if (localState) {
        verifyStateCopy(localState, verifiedState);
      }
      if (backupState) {
        verifyStateCopy(backupState, verifiedState);
      }
      await verifyInitializedRepositoryBackend(repositoryPath, destination);
      const pulled = await execute(["state", "pull"]);
      verifyStateCopy(
        verifiedState,
        parseRepositoryState(pulled.stdout, github),
      );

      return { destination, status: "remote-verified" as const };
    });
    await clearVerifiedLocalState(repositoryPath);
    return result;
  } catch (cause) {
    const localPath = path.join(repositoryPath, localStateFiles[0]);
    const backupPath = path.join(repositoryPath, localStateFiles[2]);
    if (
      (await readOptionalFile(localPath)) === undefined &&
      (await readOptionalFile(backupPath)) !== undefined
    ) {
      await fs.copyFile(backupPath, localPath, constants.COPYFILE_EXCL);
    }
    throw new Error(
      [
        cause instanceof Error
          ? cause.message
          : "Repository state preparation failed.",
        "GitHub environment apply has not run. Preserve local state and backend configuration.",
        "Retry from the repository root with the same `dx add environment` arguments (and --yes to confirm).",
      ].join("\n"),
      { cause },
    );
  }
};
