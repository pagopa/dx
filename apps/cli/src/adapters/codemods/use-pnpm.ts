import { getLogger } from "@logtape/logtape";
import { $ } from "execa";
import * as fs from "node:fs/promises";
import { replaceInFile } from "replace-in-file";
import YAML from "yaml";

import { Codemod } from "../../domain/codemod.js";
import { getLatestCommitShaOrRef } from "./git.js";
import { updateJSCodeReview } from "./update-code-review.js";
import { migrateWorkflow } from "./use-azure-appsvc.js";

async function preparePackageJsonForPnpm(): Promise<string[]> {
  const packageJson = await fs.readFile("package.json", "utf-8");
  const manifest = JSON.parse(packageJson);
  let workspaces: string[] = [];
  if (Object.hasOwn(manifest, "packageManager")) {
    delete manifest.packageManager;
  }
  if (Object.hasOwn(manifest, "workspaces")) {
    if (Array.isArray(manifest.workspaces)) {
      workspaces = manifest.workspaces;
    }
    delete manifest.workspaces;
  }
  await fs.writeFile("package.json", JSON.stringify(manifest, null, 2));
  return workspaces;
}

async function removeFiles(...files: string[]): Promise<void> {
  await Promise.all(
    files.map((file) =>
      // Remove the file if it exists, fail silently if it doesn't.
      fs.rm(file, { force: true, recursive: true }).catch(() => undefined),
    ),
  );
}

async function replaceYarnOccurrences(): Promise<void> {
  await replaceInFile({
    allowEmptyPaths: true,
    files: ["**/*.json", "**/*.md", "**/Dockerfile", "**/docker-compose.yml"],
    from: [
      "https://yarnpkg.com/",
      "https://classic.yarnpkg.com/",
      /yarn workspace (\S+)/g,
      /yarn workspace/g,
      /yarn install --immutable/g,
      /yarn -q dlx/g,
      /Yarn/gi,
    ],
    ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
    to: [
      "https://pnpm.io/",
      "https://pnpm.io/",
      "pnpm --filter $1",
      "pnpm --filter <package-selector>",
      "pnpm install --frozen-lockfile",
      "pnpm dlx",
      "pnpm",
    ],
  });
}

async function updateDXWorkflows(): Promise<void> {
  // Get the latest commit sha from the main branch of the dx repository
  const sha = await getLatestCommitShaOrRef("pagopa", "dx");
  // Update the js_code_review workflow to use the latest commit sha
  const ignore = await updateJSCodeReview(sha);
  // Update the legacy deployment workflow to release-azure-appsvc-v1.yaml
  await replaceInFile({
    allowEmptyPaths: true,
    files: [".github/workflows/*.yaml"],
    ignore,
    processor: migrateWorkflow(sha),
  });
}

async function writePnpmWorkspaceFile(workspaces: string[]): Promise<void> {
  const pnpmWorkspace = {
    packages: workspaces.length > 0 ? workspaces : ["apps/*", "packages/*"],
  };
  const yamlContent = YAML.stringify(pnpmWorkspace);
  await fs.writeFile("pnpm-workspace.yaml", yamlContent, "utf-8");
}

const apply: Codemod["apply"] = async (info) => {
  if (info.packageManager === "pnpm") {
    throw new Error("Project is already using pnpm");
  }

  const logger = getLogger(["dx-cli", "codemod", "use-pnpm"]);

  // Remove unused field from package.json
  logger.info("Preparing package.json for pnpm...");
  const workspaces = await preparePackageJsonForPnpm();

  // Create pnpm-workspace.yaml
  logger.info("Creating pnpm-workspace.yaml...");
  await writePnpmWorkspaceFile(workspaces);

  // Remove yarn and node_modules files and folders
  logger.info("Removing yarn and node_modules files...");
  await removeFiles(
    ".yarnrc",
    ".yarnrc.yml",
    "yarn.config.cjs",
    ".yarn",
    ".pnp.cjs",
    ".pnp.loader.cjs",
    "node_modules",
  );

  // Import lockfile
  logger.info("Importing yarn.lock to pnpm-lock.yaml...");
  try {
    await fs.access("yarn.lock");
    await $`corepack pnpm@latest import yarn.lock`;
    await removeFiles("yarn.lock");
  } catch {
    logger.info("No yarn.lock file found, skipping import.");
  }

  await $`corepack pnpm@latest add --config pnpm-plugin-pagopa`;

  // Replace yarn occurrences in files and update workflows
  logger.info("Replacing yarn occurrences in files...");
  await replaceYarnOccurrences();
  await updateDXWorkflows();

  // Set pnpm as the package manager
  logger.info("Setting pnpm as the package manager...");
  await $`corepack use pnpm@latest`;
};

export default {
  apply,
  description: "A codemod that switches the project to use pnpm",
  id: "use-pnpm",
} satisfies Codemod;
