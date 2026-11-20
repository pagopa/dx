import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { type Node } from "web-tree-sitter";
import { z } from "zod/v4";

import {
  type EnvironmentId,
  getBaseEnvironmentName,
} from "../../domain/environment.js";
import {
  type TerraformBackend,
  terraformBackendSchema,
} from "../../domain/remote-backend.js";
import {
  blockLabels,
  inspectHcl,
  nodeOfType,
  stringLiteralNode,
} from "./hcl-parser.js";

export type TerraformBackendConfiguration = {
  backend: TerraformBackend;
  filePath: string;
  key: string;
};

const readDirectory = async (root: string) => {
  try {
    return await readdir(root, { withFileTypes: true });
  } catch (cause) {
    if (
      typeof cause === "object" &&
      cause !== null &&
      "code" in cause &&
      cause.code === "ENOENT"
    ) {
      return [];
    }
    throw new Error(`Cannot inspect Terraform directory ${root}.`, { cause });
  }
};

const onlyNode = (
  nodes: Node[],
  description: string,
  filePath: string,
): Node => {
  const node = nodes[0];
  if (nodes.length !== 1 || !node) {
    throw new Error(
      `Cannot resolve ${description} in ${filePath}; expected exactly one literal configuration.`,
    );
  }
  return node;
};

const parseStringAttribute = (
  body: Node,
  name: string,
  filePath: string,
): string => {
  const attributes = body.namedChildren.filter(
    (node) =>
      node.type === "attribute" &&
      nodeOfType(node, "identifier")?.text === name,
  );
  const attribute = onlyNode(attributes, `"${name}"`, filePath);
  const expression = nodeOfType(attribute, "expression");
  const string = expression && stringLiteralNode(expression);
  if (!string) {
    throw new Error(
      `Cannot resolve "${name}" in ${filePath}; expected a literal string.`,
    );
  }
  try {
    return z.string().min(1).parse(JSON.parse(string.text));
  } catch (cause) {
    throw new Error(`Invalid literal "${name}" in ${filePath}.`, { cause });
  }
};

export const parseTerraformBackendConfiguration = async (
  content: string,
  filePath: string,
): Promise<TerraformBackendConfiguration | undefined> =>
  inspectHcl(content, filePath, (root) => {
    const rootBody = nodeOfType(root, "body");
    const terraformBlocks =
      rootBody?.namedChildren.filter(
        (node) =>
          node.type === "block" &&
          nodeOfType(node, "identifier")?.text === "terraform",
      ) ?? [];
    const backendBlocks = terraformBlocks.flatMap((terraformBlock) => {
      const terraformBody = nodeOfType(terraformBlock, "body");
      return (
        terraformBody?.namedChildren.filter(
          (node) =>
            node.type === "block" &&
            nodeOfType(node, "identifier")?.text === "backend",
        ) ?? []
      );
    });
    if (backendBlocks.length === 0) {
      return undefined;
    }
    const backendBlock = onlyNode(backendBlocks, "backend block", filePath);
    if (blockLabels(backendBlock)[0]?.text !== '"azurerm"') {
      throw new Error(
        `Cannot resolve backend type in ${filePath}; expected a literal azurerm backend.`,
      );
    }
    const backendBody = nodeOfType(backendBlock, "body");
    if (!backendBody) {
      throw new Error(`Cannot resolve azurerm backend body in ${filePath}.`);
    }

    return {
      backend: terraformBackendSchema.parse({
        containerName: parseStringAttribute(
          backendBody,
          "container_name",
          filePath,
        ),
        resourceGroupName: parseStringAttribute(
          backendBody,
          "resource_group_name",
          filePath,
        ),
        storageAccountName: parseStringAttribute(
          backendBody,
          "storage_account_name",
          filePath,
        ),
        subscriptionId: parseStringAttribute(
          backendBody,
          "subscription_id",
          filePath,
        ),
        type: "azurerm",
      }),
      filePath,
      key: parseStringAttribute(backendBody, "key", filePath),
    };
  });

const readTerraformBackendFromRoot = async (
  projectRoot: string,
  root: string,
): Promise<TerraformBackendConfiguration | undefined> => {
  const entries = await readDirectory(root);
  const configurations: TerraformBackendConfiguration[] = [];
  for (const entry of entries.filter(
    (candidate) =>
      candidate.isFile() &&
      (candidate.name.endsWith(".tf") || candidate.name.endsWith(".tf.json")),
  )) {
    const filePath = path.join(root, entry.name);
    let content: string;
    try {
      content = await readFile(filePath, "utf8");
    } catch (cause) {
      throw new Error(
        `Cannot read Terraform configuration ${path.relative(projectRoot, filePath)}.`,
        { cause },
      );
    }

    if (entry.name.endsWith(".tf.json")) {
      let document: unknown;
      try {
        document = JSON.parse(content);
      } catch (cause) {
        throw new Error(
          `Invalid Terraform JSON configuration ${path.relative(projectRoot, filePath)}.`,
          { cause },
        );
      }
      const parsed = z.record(z.string(), z.unknown()).safeParse(document);
      if (
        parsed.success &&
        typeof parsed.data.terraform === "object" &&
        parsed.data.terraform !== null &&
        "backend" in parsed.data.terraform
      ) {
        throw new Error(
          `Cannot resolve JSON Terraform backend configuration in ${path.relative(projectRoot, filePath)}; use literal HCL backend coordinates.`,
        );
      }
      continue;
    }

    const configuration = await parseTerraformBackendConfiguration(
      content,
      path.relative(projectRoot, filePath),
    );
    if (configuration) {
      configurations.push(configuration);
    }
  }

  if (configurations.length > 1) {
    throw new Error(
      `Multiple Terraform backend configurations found in ${path.relative(projectRoot, root)}; resolve the active backend manually.`,
    );
  }
  return configurations[0];
};

export type ExistingTerraformRoot = {
  backendConfiguration?: TerraformBackendConfiguration;
  layer: string;
  relativePath?: string;
  root: string;
};

const excludedRootDirectories = new Set([
  ".git",
  ".terraform",
  "_modules",
  "modules",
  "node_modules",
]);

const findTerraformRoots = async (
  root: string,
  excludedRoot?: string,
  includeStateOnlyRoot = false,
): Promise<string[]> => {
  const entries = await readDirectory(root);
  const roots = entries.some(
    (entry) =>
      (entry.isFile() && entry.name === "main.tf") ||
      (includeStateOnlyRoot &&
        [
          ".terraform",
          "terraform.tfstate",
          "terraform.tfstate.backup",
        ].includes(entry.name)),
  )
    ? [root]
    : [];
  for (const entry of entries.filter((candidate) => {
    const childPath = path.join(root, candidate.name);
    return (
      candidate.isDirectory() &&
      !excludedRootDirectories.has(candidate.name) &&
      childPath !== excludedRoot
    );
  })) {
    roots.push(
      ...(await findTerraformRoots(path.join(root, entry.name), excludedRoot)),
    );
  }
  return roots;
};

export const discoverEnvironmentTerraformRoots = async (
  projectRoot: string,
  environmentName: EnvironmentId["name"],
  workspaceDomain: string,
): Promise<ExistingTerraformRoot[]> => {
  const infraRoot = path.join(projectRoot, "infra");
  const layers = await readDirectory(infraRoot);
  const lifecycle = getBaseEnvironmentName(environmentName);
  const roots: ExistingTerraformRoot[] = [];
  for (const layerEntry of layers.filter((entry) => entry.isDirectory())) {
    const layer = layerEntry.name;
    if (layer === "repository") {
      continue;
    }
    const directRoot = path.join(infraRoot, layer, environmentName);
    const tenantRoot = path.join(infraRoot, layer, lifecycle, workspaceDomain);
    for (const [environmentRoot, excluded] of [
      [directRoot, tenantRoot],
      [tenantRoot, undefined],
    ] as const) {
      for (const root of await findTerraformRoots(
        environmentRoot,
        excluded,
        layer === "bootstrapper" || layer === "core",
      )) {
        const relative = path.relative(environmentRoot, root);
        const backendConfiguration = await readTerraformBackendFromRoot(
          projectRoot,
          root,
        );
        roots.push({
          backendConfiguration,
          layer,
          relativePath: relative || undefined,
          root,
        });
      }
    }
  }
  return roots.sort((left, right) => left.root.localeCompare(right.root));
};

export const readTerraformBackendConfiguration = async (
  projectRoot: string,
  layer: string,
  environmentName: EnvironmentId["name"],
  workspaceDomain: string,
): Promise<TerraformBackendConfiguration | undefined> => {
  const lifecycle = getBaseEnvironmentName(environmentName);
  const environmentRoots = new Set([
    path.join(projectRoot, "infra", layer, environmentName),
    path.join(projectRoot, "infra", layer, lifecycle, workspaceDomain),
  ]);
  const configurations: TerraformBackendConfiguration[] = [];

  for (const root of environmentRoots) {
    const configuration = await readTerraformBackendFromRoot(projectRoot, root);
    if (configuration) configurations.push(configuration);
  }

  if (configurations.length > 1) {
    throw new Error(
      `Multiple Terraform backend configurations found for ${layer}/${environmentName}; resolve the active backend manually.`,
    );
  }
  return configurations[0];
};
