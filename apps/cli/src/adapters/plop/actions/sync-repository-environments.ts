/**
 * Updates infra/repository/main.tf and applies it so GitHub.com repository
 * environments exist before deployment scaffolding continues.
 *
 * The repository Terraform module remains the source of truth for GitHub
 * environments, including protection rules and reviewers. This action only
 * changes the module's `repository.environments` input, then runs Terraform from
 * infra/repository to create or update the environments on GitHub.
 */
import { type NodePlopAPI } from "node-plop";
import fs from "node:fs/promises";
import path from "node:path";

import type { Environment } from "../../../domain/environment.js";

import { tf$ } from "../../execa/terraform.js";
import {
  type Payload,
  payloadSchema,
} from "../generators/environment/prompts.js";

const KNOWN_ENVIRONMENTS: Environment["name"][] = ["dev", "uat", "prod"];
const KNOWN_ENVIRONMENT_NAMES: readonly string[] = KNOWN_ENVIRONMENTS;

const environmentList = (environments: Set<string>): string =>
  `[${[
    ...KNOWN_ENVIRONMENTS.filter((environment) =>
      environments.has(environment),
    ),
    ...Array.from(environments).filter(
      (environment) => !KNOWN_ENVIRONMENT_NAMES.includes(environment),
    ),
  ]
    .map((environment) => `"${environment}"`)
    .join(", ")}]`;

/**
 * Returns the inner body of the `repository = { ... }` object.
 *
 * Example input:
 * repository = {
 *   name = "repo"
 * }
 *
 * Example output:
 *   name = "repo"
 */
const findRepositoryBlock = (
  content: string,
): { block: string; end: number; start: number } => {
  const match =
    /(?:^|\n)(?<indent>[^\S\r\n]*)repository[^\S\r\n]*=[^\S\r\n]*\{\n/.exec(
      content,
    );
  if (!match) {
    throw new Error(
      "Cannot find the repository configuration in infra/repository/main.tf",
    );
  }

  const blockStart = match.index + match[0].length;
  const closingMatch = new RegExp(`\\n${match.groups?.indent ?? ""}\\}`).exec(
    content.slice(blockStart),
  );
  if (!closingMatch) {
    throw new Error(
      "Cannot find the end of the repository configuration in infra/repository/main.tf",
    );
  }

  const end = blockStart + closingMatch.index;
  return { block: content.slice(blockStart, end), end, start: blockStart };
};

const repositoryPropertyIndent = (block: string): string => {
  const propertyMatch = /^(?<indent>\s*)\w+\s*=/m.exec(block);
  return propertyMatch?.groups?.indent ?? "    ";
};

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

export const syncRepositoryTerraformEnvironments = (
  content: string,
  environmentName: Environment["name"],
): string => {
  const repositoryBlock = findRepositoryBlock(content);
  const environmentsMatch =
    /^(?<indent>\s*)environments\s*=\s*\[(?<values>[\s\S]*?)\]\s*$/m.exec(
      repositoryBlock.block,
    );

  if (!environmentsMatch) {
    if (environmentName === "prod") {
      return content;
    }

    // Without an explicit list, the Terraform module manages prod by default.
    // Adding a non-prod environment must also keep prod explicit.
    const environments = new Set<string>([environmentName, "prod"]);
    const propertyIndent = repositoryPropertyIndent(repositoryBlock.block);
    const separator = repositoryBlock.block.endsWith("\n") ? "" : "\n";
    const updatedBlock = `${repositoryBlock.block}${separator}${propertyIndent}environments           = ${environmentList(environments)}`;
    return `${content.slice(0, repositoryBlock.start)}${updatedBlock}${content.slice(repositoryBlock.end)}`;
  }

  const existingEnvironments = new Set(
    Array.from((environmentsMatch.groups?.values ?? "").matchAll(/"([^"]+)"/g))
      .map((match) => match[1])
      .filter((environment) => environment.length > 0),
  );
  const hasSelectedEnvironment = existingEnvironments.has(environmentName);
  const hasProdEnvironment = existingEnvironments.has("prod");
  if (hasSelectedEnvironment && hasProdEnvironment) {
    return content;
  }

  existingEnvironments.add(environmentName);
  existingEnvironments.add("prod");
  const indent = environmentsMatch.groups?.indent ?? "    ";
  const updatedLine = `${indent}environments           = ${environmentList(existingEnvironments)}`;
  const updatedBlock = repositoryBlock.block.replace(
    environmentsMatch[0],
    updatedLine,
  );

  return `${content.slice(0, repositoryBlock.start)}${updatedBlock}${content.slice(repositoryBlock.end)}`;
};

export const syncRepositoryEnvironments = async (
  payload: Payload,
): Promise<void> => {
  const repositoryPath = path.join(process.cwd(), "infra", "repository");
  const repositoryMainPath = path.join(repositoryPath, "main.tf");

  const currentRepositoryConfig =
    await readRepositoryConfig(repositoryMainPath);
  const updatedRepositoryConfig = syncRepositoryTerraformEnvironments(
    currentRepositoryConfig,
    payload.env.name,
  );

  if (updatedRepositoryConfig !== currentRepositoryConfig) {
    await fs.writeFile(repositoryMainPath, updatedRepositoryConfig, "utf8");
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
