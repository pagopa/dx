/**
 * Updates infra/repository/main.tf and applies it so GitHub.com repository
 * environments exist before deployment scaffolding continues.
 *
 * The repository Terraform module remains the source of truth for GitHub
 * environments, including protection rules and reviewers. This action only
 * changes the module's `repository.environments` input, then runs Terraform from
 * infra/repository to create or update the environments on GitHub.
 * Concurrent writers to the same working copy are not supported.
 */
import { type NodePlopAPI } from "node-plop";
import { constants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";

import { tf$, validateTerraformSource } from "../../execa/terraform.js";
import { updateRepositoryEnvironmentsHcl } from "../../terraform/hcl-repository-environments.js";
import {
  type Payload,
  payloadSchema,
} from "../generators/environment/prompts.js";

const readRepositoryConfig = async (
  repositoryMainPath: string,
): Promise<string> => {
  // O_RDONLY is zero; O_NONBLOCK keeps opening FIFOs from hanging.
  const file = await fs
    .open(repositoryMainPath, constants.O_NONBLOCK ?? "r")
    .catch((cause: unknown) => {
      throw new Error(
        `Cannot synchronize GitHub repository environments because ${path.relative(process.cwd(), repositoryMainPath)} does not exist or is not readable.`,
        { cause },
      );
    });

  try {
    // Validate the opened file; the path check only rejects symbolic links.
    const [info, pathInfo] = await Promise.all([
      file.stat(),
      fs.lstat(repositoryMainPath),
    ]);
    if (!info.isFile() || !pathInfo.isFile()) {
      throw new Error(
        "Cannot safely read infra/repository/main.tf; expected a regular file",
      );
    }

    const bytes = await file.readFile().catch((cause: unknown) => {
      throw new Error(
        `Cannot synchronize GitHub repository environments because ${path.relative(process.cwd(), repositoryMainPath)} does not exist or is not readable.`,
        { cause },
      );
    });

    try {
      return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
        bytes,
      );
    } catch (cause) {
      throw new Error(
        `Cannot safely read ${path.relative(process.cwd(), repositoryMainPath)}; expected valid UTF-8.`,
        { cause },
      );
    }
  } finally {
    await file.close();
  }
};

const replaceRepositoryConfig = async (
  repositoryMainPath: string,
  updated: string,
): Promise<void> => {
  const info = await fs.lstat(repositoryMainPath);
  if (!info.isFile()) {
    throw new Error(
      "Cannot safely replace infra/repository/main.tf; expected a regular file",
    );
  }

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
  const updatedRepositoryConfig = await updateRepositoryEnvironmentsHcl(
    repositoryConfig,
    payload.env.name,
  );
  if (updatedRepositoryConfig !== repositoryConfig) {
    await validateTerraformSource(
      updatedRepositoryConfig,
      path.relative(process.cwd(), repositoryMainPath),
    );
    await replaceRepositoryConfig(repositoryMainPath, updatedRepositoryConfig);
  }

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
