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
import fs from "node:fs/promises";
import path from "node:path";

import { tf$ } from "../../execa/terraform.js";
import { updateRepositoryEnvironmentsHcl } from "../../terraform/hcl-repository-environments.js";
import {
  type Payload,
  payloadSchema,
} from "../generators/environment/prompts.js";

const readRepositoryConfig = async (repositoryMainPath: string) => {
  try {
    return await fs.readFile(repositoryMainPath, "utf8");
  } catch (cause) {
    throw new Error(
      `Cannot synchronize GitHub repository environments because ${path.relative(process.cwd(), repositoryMainPath)} does not exist or is not readable.`,
      { cause },
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
  previous: string,
  updated: string,
): Promise<void> => {
  const info = await fs.lstat(repositoryMainPath);
  if (!info.isFile()) {
    throw new Error(
      "Cannot update infra/repository/main.tf because it is not a regular file",
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
    if ((await fs.readFile(repositoryMainPath, "utf8")) !== previous) {
      throw new Error(
        "infra/repository/main.tf changed during synchronization; refusing to overwrite it",
      );
    }
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

  const currentRepositoryConfig =
    await readRepositoryConfig(repositoryMainPath);
  const updatedRepositoryConfig = await syncRepositoryTerraformEnvironments(
    currentRepositoryConfig,
    payload.env.name,
  );

  await validateTerraformSource(currentRepositoryConfig);
  if (updatedRepositoryConfig !== currentRepositoryConfig) {
    await validateTerraformSource(updatedRepositoryConfig);
    await replaceRepositoryConfig(
      repositoryMainPath,
      currentRepositoryConfig,
      updatedRepositoryConfig,
    );
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
