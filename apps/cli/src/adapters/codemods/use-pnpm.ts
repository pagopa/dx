import { getLogger } from "@logtape/logtape";
import { $ } from "execa";
import * as fs from "node:fs/promises";
import { replaceInFile } from "replace-in-file";
import YAML from "yaml";
import { z } from "zod";

import { Codemod } from "../../domain/codemod.js";

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
      /https:\/\/classic.yarnpkg.com\//g,
      /https:\/\/yarnpkg.com\//g,
      /yarn workspace (\S+)/g,
      /yarn install --immutable/g,
      /yarn -q dlx/g,
      /Yarn/g,
      /yarn/g,
    ],
    ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
    to: [
      "https://pnpm.io/",
      "https://pnpm.io/",
      "pnpm --filter $1",
      "pnpm install --frozen-lockfile",
      "pnpm dlx",
      "pnpm",
      "pnpm",
    ],
  });
}

async function updateDXWorkflows(): Promise<void> {
  // Get the latest commit sha from the main branch of the dx repository
  const { stdout } = await $({
    lines: true,
  })`git ls-remote https://github.com/pagopa/dx/`;
  const sha = stdout.at(0)?.split("\t").at(0) ?? "main";

  // Update the js_code_review workflow to use the latest commit sha
  const results = await replaceInFile({
    allowEmptyPaths: true,
    files: [".github/workflows/*.yaml"],
    from: [/pagopa\/dx\/.github\/workflows\/js_code_review.yaml@(\S+)/g],
    to: [`pagopa/dx/.github/workflows/js_code_review.yaml@${sha}`],
  });

  // Exclude files that were changed by the previous replacement
  const ignore = results.filter((r) => r.hasChanged).map((r) => r.file);

  // Update the legacy deploy workflow to release-azure-appsvc-v1.yaml
  await replaceInFile({
    allowEmptyPaths: true,
    files: [".github/workflows/*.yaml"],
    ignore,
    processor: (input) => {
      // Only process files that contain function_app_deploy or web_app_deploy
      const pattern = /function_app_deploy|web_app_deploy/;
      if (!pattern.test(input)) {
        return input;
      }

      // Parse the YAML file
      const workflowFile = YAML.parse(input);
      const workflowSchema = z
        .object({
          jobs: z.record(
            z
              .object({
                uses: z.string(),
                with: z.record(z.unknown()),
              })
              .passthrough(),
          ),
        })
        .passthrough();
      const workflow = workflowSchema.parse(workflowFile);

      // Update workflow parameters to be compatible with release-azure-appsvc.yaml
      for (const jobName in workflow.jobs) {
        if (Object.hasOwn(workflow.jobs, jobName)) {
          const job = workflow.jobs[jobName];
          const { with: jobWith, ...rest } = job;
          if (pattern.test(job.uses)) {
            delete jobWith.use_staging_slot;
            jobWith.disable_auto_staging_deploy = true;
            if (jobWith.function_app_name) {
              jobWith.web_app_name = jobWith.function_app_name;
              delete jobWith.function_app_name;
            }
          }
          workflow.jobs[jobName] = {
            ...rest,
            uses: `pagopa/dx/.github/workflows/release-azure-appsvc.yaml@${sha}`,
            with: jobWith,
          };
        }
      }
      // Reorder the keys to have jobs at the end of the file
      const { jobs, ...rest } = workflow;
      return YAML.stringify({ ...rest, jobs });
    },
  });
}

async function writePnpmWorkspaceFile(workspaces: string[]): Promise<void> {
  const pnpmWorkspace = {
    linkWorkspacePackages: true,
    packageImportMethod: "clone-or-copy",
    packages: workspaces.length > 0 ? workspaces : ["apps/*", "packages/*"],
  };
  const yamlContent = YAML.stringify(pnpmWorkspace);
  await fs.writeFile("pnpm-workspace.yaml", yamlContent, "utf-8");
}

const apply: Codemod["apply"] = async (info) => {
  if (info.packageManager === "pnpm") {
    throw new Error("Project is already using pnpm");
  }

  const logger = getLogger(["dx-cli", "codemod"]);

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
    await $`corepack pnpm import yarn.lock`;
    await removeFiles("yarn.lock");
  } catch {
    logger.info("No yarn.lock file found, skipping import.");
  }

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
