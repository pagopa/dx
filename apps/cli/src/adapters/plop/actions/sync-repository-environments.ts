/**
 * Updates infra/repository/main.tf and applies it so GitHub.com repository
 * environments exist before deployment scaffolding continues.
 *
 * The repository Terraform module remains the source of truth for GitHub
 * environments, including protection rules and reviewers. This action only
 * changes the module's `repository.environments` input, then runs Terraform from
 * infra/repository to create or update the environments on GitHub.
 */
import { execa } from "execa";
import { type NodePlopAPI } from "node-plop";
import fs, { type FileHandle } from "node:fs/promises";
import path from "node:path";

import { tf$ } from "../../execa/terraform.js";
import { updateRepositoryEnvironmentsHcl } from "../../terraform/hcl-repository-environments.js";
import {
  type Payload,
  payloadSchema,
} from "../generators/environment/prompts.js";

type OpenRepositoryConfig = {
  content: string;
  fileHandle: FileHandle;
  info: RepositoryFileInfo;
};
type RepositoryFileInfo = Awaited<ReturnType<typeof fs.lstat>>;

const readFileHandle = async (fileHandle: FileHandle): Promise<string> => {
  const chunks: Buffer[] = [];
  let position = 0;
  while (true) {
    const buffer = Buffer.alloc(64 * 1024);
    const { bytesRead } = await fileHandle.read(
      buffer,
      0,
      buffer.length,
      position,
    );
    if (bytesRead === 0) {
      break;
    }
    chunks.push(buffer.subarray(0, bytesRead));
    position += bytesRead;
  }
  return Buffer.concat(chunks).toString("utf8");
};

const isSameRegularFile = (
  openedFileInfo: RepositoryFileInfo,
  pathInfo: RepositoryFileInfo,
): boolean =>
  openedFileInfo.isFile() &&
  pathInfo.isFile() &&
  openedFileInfo.dev === pathInfo.dev &&
  openedFileInfo.ino === pathInfo.ino;

const assertRepositoryFilePath = async (
  repositoryMainPath: string,
  openedFileInfo: RepositoryFileInfo,
): Promise<void> => {
  const pathInfo = await fs.lstat(repositoryMainPath);
  if (!isSameRegularFile(openedFileInfo, pathInfo)) {
    throw new Error(
      "infra/repository/main.tf changed during synchronization; refusing to overwrite it",
    );
  }
};

const closeFileHandleAfterError = async (
  fileHandle: FileHandle,
  error: unknown,
): Promise<never> => {
  try {
    await fileHandle.close();
  } catch (closeCause) {
    throw new AggregateError(
      [error, closeCause],
      "Repository environment synchronization failed and its file handle could not be closed",
      { cause: closeCause },
    );
  }
  throw error;
};

const readRepositoryConfig = async (
  repositoryMainPath: string,
): Promise<OpenRepositoryConfig> => {
  let fileHandle: FileHandle;
  try {
    fileHandle = await fs.open(repositoryMainPath, "r");
  } catch (cause) {
    throw new Error(
      `Cannot synchronize GitHub repository environments because ${path.relative(process.cwd(), repositoryMainPath)} does not exist or is not readable.`,
      { cause },
    );
  }

  try {
    const info = await fileHandle.stat();
    await assertRepositoryFilePath(repositoryMainPath, info);
    const content = await readFileHandle(fileHandle);
    return { content, fileHandle, info };
  } catch (cause) {
    return closeFileHandleAfterError(
      fileHandle,
      new Error(
        `Cannot safely read ${path.relative(process.cwd(), repositoryMainPath)}.`,
        { cause },
      ),
    );
  }
};

export const syncRepositoryTerraformEnvironments =
  updateRepositoryEnvironmentsHcl;

const validateTerraformSource = async (content: string): Promise<void> => {
  try {
    await execa({ input: content })("terraform", ["fmt", "-"]);
  } catch (cause) {
    throw new Error(
      "Cannot validate Terraform HCL in infra/repository/main.tf; no changes were written",
      { cause },
    );
  }
};

const replaceRepositoryConfig = async (
  repositoryMainPath: string,
  repositoryConfig: OpenRepositoryConfig,
  updated: string,
): Promise<void> => {
  const info = await repositoryConfig.fileHandle.stat();
  if (!isSameRegularFile(repositoryConfig.info, info)) {
    throw new Error(
      "infra/repository/main.tf changed during synchronization; refusing to overwrite it",
    );
  }
  await assertRepositoryFilePath(repositoryMainPath, info);

  const temporaryDirectory = await fs.mkdtemp(
    path.join(path.dirname(repositoryMainPath), ".main-tf-"),
  );
  const temporaryFile = path.join(temporaryDirectory, "main.tf");
  try {
    await fs.writeFile(temporaryFile, updated, {
      encoding: "utf8",
      mode: info.mode,
    });
    await fs.chmod(temporaryFile, info.mode);
    if (
      (await readFileHandle(repositoryConfig.fileHandle)) !==
      repositoryConfig.content
    ) {
      throw new Error(
        "infra/repository/main.tf changed during synchronization; refusing to overwrite it",
      );
    }
    const latestInfo = await repositoryConfig.fileHandle.stat();
    if (!isSameRegularFile(repositoryConfig.info, latestInfo)) {
      throw new Error(
        "infra/repository/main.tf changed during synchronization; refusing to overwrite it",
      );
    }
    await assertRepositoryFilePath(repositoryMainPath, latestInfo);
    await fs.rename(temporaryFile, repositoryMainPath);
  } catch (cause) {
    try {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    } catch (cleanupCause) {
      throw new AggregateError(
        [cause, cleanupCause],
        "Cannot update infra/repository/main.tf or clean up its temporary file",
        { cause: cleanupCause },
      );
    }
    throw new Error("Cannot safely update infra/repository/main.tf", {
      cause,
    });
  }
  await fs.rm(temporaryDirectory, { force: true, recursive: true });
};

export const syncRepositoryEnvironments = async (
  payload: Payload,
): Promise<void> => {
  const repositoryPath = path.join(process.cwd(), "infra", "repository");
  const repositoryMainPath = path.join(repositoryPath, "main.tf");

  const repositoryConfig = await readRepositoryConfig(repositoryMainPath);
  try {
    const updatedRepositoryConfig = await syncRepositoryTerraformEnvironments(
      repositoryConfig.content,
      payload.env.name,
    );

    await validateTerraformSource(repositoryConfig.content);
    if (updatedRepositoryConfig !== repositoryConfig.content) {
      await validateTerraformSource(updatedRepositoryConfig);
      await replaceRepositoryConfig(
        repositoryMainPath,
        repositoryConfig,
        updatedRepositoryConfig,
      );
    }
  } catch (cause) {
    return closeFileHandleAfterError(repositoryConfig.fileHandle, cause);
  }
  await repositoryConfig.fileHandle.close();

  const repositoryTerraform = tf$({ cwd: repositoryPath });
  await repositoryTerraform`terraform init`;
  await repositoryTerraform`terraform apply -auto-approve`;
};

export default function (plop: NodePlopAPI): void {
  plop.setActionType("syncRepositoryEnvironments", async (data) => {
    const payload = payloadSchema.parse(data);
    await syncRepositoryEnvironments(payload);
    return "GitHub repository environments updated from Terraform";
  });
}
