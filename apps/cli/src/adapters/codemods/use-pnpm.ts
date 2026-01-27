import { getLogger } from "@logtape/logtape";
import { $ } from "execa";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { replaceInFile } from "replace-in-file";
import semver from "semver";
import YAML from "yaml";

import { Codemod } from "../../domain/codemod.js";
import { getLatestCommitShaOrRef } from "./git.js";
import { updateJSCodeReviewJob } from "./update-code-review.js";
import { migrateWorkflow } from "./use-azure-appsvc.js";

type NodePackageManager = {
  listWorkspaces(): Promise<string[]>;
  lockFileName: string;
};

export class NPM implements NodePackageManager {
  lockFileName = "package-lock.json";

  async listWorkspaces(): Promise<string[]> {
    const { stdout } = await $`npm query .workspace`;
    const workspaces = JSON.parse(stdout);
    const workspaceNames = [];
    if (Array.isArray(workspaces)) {
      for (const ws of workspaces) {
        if (Object.hasOwn(ws, "name")) {
          workspaceNames.push(ws.name);
        }
      }
    }
    return workspaceNames;
  }
}

export class Yarn implements NodePackageManager {
  lockFileName = "yarn.lock";

  async listWorkspaces(): Promise<string[]> {
    const { stdout } = await $({ lines: true })`yarn workspaces list --json`;
    const workspaceNames = [];
    for (const line of stdout) {
      const ws = JSON.parse(line);
      if (Object.hasOwn(ws, "name")) {
        workspaceNames.push(ws.name);
      }
    }
    return workspaceNames;
  }
}

export async function extractPackageExtensions(): Promise<object | undefined> {
  // Read the .yarnrc.yaml file if it exists and extract the packageExtensions field
  try {
    const yarnrc = await fs.readFile(".yarnrc.yml", "utf-8");
    const parsed = YAML.parse(yarnrc);
    if (parsed.packageExtensions) {
      return parsed.packageExtensions;
    }
  } catch {
    // File does not exist or is not readable, ignore
  }
  return undefined;
}

export async function preparePackageJsonForPnpm(): Promise<string[]> {
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

export async function writePnpmWorkspaceFile(
  workspaces: string[],
  packageExtensions: object | undefined,
): Promise<void> {
  // We inline all the default settings here because Renovate
  // does not support PNPM's config dependencies yet.
  const pnpmWorkspace = {
    cleanupUnusedCatalogs: true,
    linkWorkspacePackages: true,
    packageExtensions,
    packageImportMethod: "clone-or-copy",
    packages: workspaces.length > 0 ? workspaces : ["apps/*", "packages/*"],
  };
  const yamlContent = YAML.stringify(pnpmWorkspace);
  await fs.writeFile("pnpm-workspace.yaml", yamlContent, "utf-8");
}

async function removeFiles(...files: string[]): Promise<void> {
  await Promise.all(
    files.map((file) =>
      // Remove the file if it exists, fail silently if it doesn't.
      fs.rm(file, { force: true, recursive: true }).catch(() => undefined),
    ),
  );
}

async function replacePMOccurrences(): Promise<void> {
  const logger = getLogger(["dx-cli", "codemod"]);
  logger.info("Replacing yarn and npm occurrences in files...");
  const results = await replaceInFile({
    allowEmptyPaths: true,
    files: ["**/*.json", "**/*.md", "**/Dockerfile", "**/docker-compose.yml"],
    from: [
      "https://yarnpkg.com/",
      "https://classic.yarnpkg.com/",
      /\b(yarn workspace|npm -(\b-workspace\b|\bw\b)) (\S+)\b/g,
      /\b(yarn workspace|npm -(\b-workspace\b|\bw\b))\b/g,
      /\b(yarn install --immutable|npm ci)\b/g,
      /\b(yarn -q dlx|npx)\b/g,
      /\b((yarn|npm) run)\b/g,
      /(^|\s|")(yarn|npm)(?!\S)/gi,
    ],
    ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
    to: [
      "https://pnpm.io/",
      "https://pnpm.io/",
      "pnpm --filter $3",
      "pnpm --filter <package-selector>",
      "pnpm install --frozen-lockfile",
      "pnpm dlx",
      "pnpm run",
      "$1pnpm",
    ],
  });
  const count = results.reduce(
    (acc, file) => (file.hasChanged ? acc + 1 : acc),
    0,
  );
  logger.info("Replaced yarn occurrences in {count} files", { count });
}

async function updateDXWorkflows(): Promise<void> {
  const logger = getLogger(["dx-cli", "codemod"]);
  logger.info("Updating Github Workflows workflows...");
  // Get the latest commit sha from the main branch of the dx repository
  const sha = await getLatestCommitShaOrRef("pagopa", "dx");
  // Update the js_code_review workflow to use the latest commit sha
  const results = await replaceInFile({
    allowEmptyPaths: true,
    files: [".github/workflows/*.yaml"],
    processor: updateJSCodeReviewJob(sha),
  });
  const ignore = results.filter((r) => r.hasChanged).map((r) => r.file);
  // Update the legacy deployment workflow to release-azure-appsvc-v1.yaml
  await replaceInFile({
    allowEmptyPaths: true,
    files: [".github/workflows/*.yaml"],
    ignore,
    processor: migrateWorkflow(sha),
  });
}

export const usePnpm = async (
  packageManager: string,
  currentNodeVersion: string,
) => {
  const minNodeVersion = "20.19.5";

  assert.notEqual(packageManager, "pnpm", "Project is already using pnpm");

  assert.ok(
    semver.gte(currentNodeVersion, minNodeVersion),
    `his codemod requires Node.js >= ${minNodeVersion}. Current version: ${currentNodeVersion}`,
  );

  const logger = getLogger(["dx-cli", "codemod"]);

  const pm = packageManager === "yarn" ? new Yarn() : new NPM();
  const localWorkspaces = await pm.listWorkspaces();

  // Update local dependencies to use "workspace:" protocol
  if (localWorkspaces.length > 0) {
    logger.info("Using the {protocol} protocol for local dependencies", {
      protocol: "workspace:",
    });
    await replaceInFile({
      allowEmptyPaths: true,
      files: ["**/package.json"],
      from: localWorkspaces.map((ws) => new RegExp(`"${ws}": ".*?"`, "g")),
      to: localWorkspaces.map((ws) => `"${ws}": "workspace:^"`),
    });
  }

  // Remove unused field from package.json
  logger.info("Remove unused fields from {file}", {
    file: "package.json",
  });
  const workspaces = await preparePackageJsonForPnpm();

  // Extract custom packageExtensions from .yarnrc.yml if any
  const packageExtensions =
    packageManager === "yarn" ? await extractPackageExtensions() : undefined;

  // Create pnpm-workspace.yaml
  logger.info("Create {file}", {
    file: "pnpm-workspace.yaml",
  });
  await writePnpmWorkspaceFile(workspaces, packageExtensions);

  // Remove yarn and node_modules files and folders
  logger.info("Remove node_modules and yarn files");
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
  const stat = await fs.stat(pm.lockFileName);
  if (stat.isFile()) {
    logger.info("Importing {source} to {target}", {
      source: pm.lockFileName,
      target: "pnpm-lock.yaml",
    });
    await $`corepack pnpm@latest import ${pm.lockFileName}`;
    await removeFiles(pm.lockFileName);
  } else {
    logger.info("No {source} file found, skipping import.", {
      source: pm.lockFileName,
    });
  }

  // Replace yarn and npm occurrences in files and update workflows
  await replacePMOccurrences();
  await updateDXWorkflows();

  // Add pnpm store to .gitignore
  logger.info("Adding pnpm store to .gitignore...");
  await fs.appendFile(".gitignore", "\n\n# PNPM\n.pnpm-store");

  // Set pnpm as the package manager
  logger.info("Setting pnpm as the package manager...");
  await $`corepack use pnpm@latest`;
};

const apply: Codemod["apply"] = async (info) => {
  const logger = getLogger(["dx-cli", "codemod"]);
  try {
    await usePnpm(info.packageManager, process.versions.node);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    }
  }
};

export default {
  apply,
  description: "Migrate the project to use pnpm as the package manager",
  id: "use-pnpm",
} satisfies Codemod;
