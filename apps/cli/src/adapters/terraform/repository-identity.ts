import type { Node } from "web-tree-sitter";

/**
 * Verifies the scaffolded Terraform root targets the GitHub repository in origin.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod/v4";

import type { GitHubRepo } from "../../domain/github-repo.js";

import {
  blockLabels,
  inspectHcl,
  nodeOfType,
  stringLiteralNode,
} from "./hcl-parser.js";
import { readRepositoryName } from "./hcl-repository-environments.js";

const attributes = (block: Node | undefined, name: string) =>
  block &&
  nodeOfType(block, "body")?.namedChildren.filter(
    (node) =>
      node.type === "attribute" &&
      nodeOfType(node, "identifier")?.text === name,
  );

const includesAttribute = (block: Node, name: string) =>
  (attributes(block, name)?.length ?? 0) > 0;

const readOwner = (provider: Node): string => {
  const owners = attributes(provider, "owner");
  const owner = owners?.length === 1 ? owners[0] : undefined;
  const expression = owner && nodeOfType(owner, "expression");
  const literal = expression && stringLiteralNode(expression);
  if (
    !literal ||
    includesAttribute(provider, "organization") ||
    includesAttribute(provider, "base_url")
  ) {
    throw new Error(
      "Expected a literal owner and the standard GitHub.com endpoint on the default GitHub provider.",
    );
  }
  return z.string().min(1).parse(JSON.parse(literal.text));
};

// The provider's legacy environment defaults can override an explicit HCL owner.
export const repositoryGitHubEnvironment = (github: GitHubRepo) => ({
  GITHUB_BASE_URL: "https://api.github.com/",
  GITHUB_ORGANIZATION: "",
  GITHUB_OWNER: github.owner,
});

const identityLabel = (block: Node): string | undefined => {
  const label = blockLabels(block)[0];
  if (!label) {
    return undefined;
  }
  return label.type === "identifier"
    ? label.text
    : z.string().parse(JSON.parse(label.text));
};

export const verifyRepositoryIdentity = async (
  repositoryPath: string,
  github: GitHubRepo,
): Promise<void> => {
  const files = await readdir(repositoryPath, { withFileTypes: true });
  const owners: string[] = [];
  const names: string[] = [];
  for (const file of files) {
    if (
      file.name.endsWith(".tf.json") ||
      /^(?:.*_)?override\.tf$/.test(file.name)
    ) {
      throw new Error(
        "Cannot verify the GitHub repository target with JSON or override Terraform configuration in infra/repository.",
      );
    }
    if (!file.name.endsWith(".tf") || file.isDirectory()) {
      continue;
    }
    if (!file.isFile()) {
      throw new Error("Expected regular Terraform files in infra/repository.");
    }
    const content = await readFile(
      path.join(repositoryPath, file.name),
      "utf8",
    );
    await inspectHcl(content, file.name, (root) => {
      const blocks = nodeOfType(root, "body")?.namedChildren ?? [];
      for (const block of blocks.filter((node) => node.type === "block")) {
        const kind = nodeOfType(block, "identifier")?.text;
        if (kind === "provider" && identityLabel(block) === "github") {
          if (!includesAttribute(block, "alias")) {
            owners.push(readOwner(block));
          }
        } else if (
          kind === "module" &&
          identityLabel(block) === "github_repository"
        ) {
          if (
            file.name !== "main.tf" ||
            includesAttribute(block, "providers")
          ) {
            throw new Error(
              'Expected module "github_repository" in infra/repository/main.tf to use the default GitHub provider.',
            );
          }
          names.push(readRepositoryName(root));
        }
      }
    });
  }
  if (
    owners.length !== 1 ||
    names.length !== 1 ||
    owners[0]?.toLowerCase() !== github.owner.toLowerCase() ||
    names[0]?.toLowerCase() !== github.repo.toLowerCase()
  ) {
    throw new Error(
      `The Terraform configuration in infra/repository does not target ${github.owner}/${github.repo}. Check the GitHub provider owner and module repository name before retrying.`,
    );
  }
};
