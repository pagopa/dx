/**
 * Extracts Terraform environment project names from the merged Version Packages
 * PR body to determine which deployable infrastructure projects should be
 * applied after release metadata is merged.
 *
 * Reads the nx-release-tags metadata comment from the PR body and outputs a
 * JSON matrix of environment projects and their deployment metadata to stdout.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import {
  createOctokit,
  extractTagEntriesFromPRBody,
  getNxProjectNames,
  getNxProjectRoot,
  getRepoInfo,
  matchProjectName,
} from "./shared.js";

const environmentManifestSchema = z.object({
  deployment: z
    .object({
      applyEnvironment: z.string().min(1),
      planEnvironment: z.string().min(1),
      runnerLabel: z.string().min(1),
    })
    .optional(),
});

interface EnvironmentTarget {
  applyEnvironment: string;
  planEnvironment: string;
  project: string;
  projectRoot: string;
  runnerLabel: string;
}

const emptyMatrix = "[]";

const isFileNotFoundError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "ENOENT";

const inferDeploymentMetadata = (
  projectRoot: string,
): Omit<EnvironmentTarget, "project" | "projectRoot"> => {
  const environmentName = path.basename(projectRoot);

  if (!environmentName || environmentName === ".") {
    throw new Error(
      `Could not infer deployment metadata from project root "${projectRoot}"`,
    );
  }

  return {
    applyEnvironment: `infra-${environmentName}-cd`,
    planEnvironment: `infra-${environmentName}-ci`,
    runnerLabel: environmentName,
  };
};

const readEnvironmentTarget = async (
  project: string,
  projectRoot: string,
): Promise<EnvironmentTarget | undefined> => {
  const manifestPath = path.join(projectRoot, "environment.json");
  let rawManifest: string;

  try {
    rawManifest = await fs.readFile(manifestPath, "utf8");
  } catch (cause) {
    if (isFileNotFoundError(cause)) {
      return undefined;
    }

    throw new Error(`Failed to read "${manifestPath}"`, { cause });
  }

  let parsedManifest: unknown;

  try {
    parsedManifest = JSON.parse(rawManifest);
  } catch (cause) {
    throw new Error(`Failed to parse "${manifestPath}" as JSON`, { cause });
  }

  const parseResult = environmentManifestSchema.safeParse(parsedManifest);

  if (!parseResult.success) {
    throw new Error(
      `Invalid deployment metadata in "${manifestPath}": ${parseResult.error.issues.map((issue) => issue.message).join("; ")}`,
    );
  }

  return {
    project,
    projectRoot,
    ...(parseResult.data.deployment ?? inferDeploymentMetadata(projectRoot)),
  };
};

/** Main entrypoint: fetches PR, extracts tags, outputs environment projects. */
export async function run(): Promise<void> {
  const prNumber = process.env.PR_NUMBER;
  if (!prNumber) {
    throw new Error("PR_NUMBER environment variable is required");
  }

  const octokit = createOctokit();
  const { owner, repo } = await getRepoInfo();

  console.error(`Fetching PR #${prNumber} to extract release tags`);

  const { data: pr } = await octokit.pulls.get({
    owner,
    pull_number: parseInt(prNumber, 10),
    repo,
  });

  if (!pr.body) {
    throw new Error(
      `Version Packages PR #${prNumber} has an empty body; cannot determine released environments`,
    );
  }

  const tagEntries = extractTagEntriesFromPRBody(pr.body);

  if (tagEntries.length === 0) {
    throw new Error(
      `Version Packages PR #${prNumber} has no valid nx-release-tags metadata`,
    );
  }

  const projectNames = await getNxProjectNames();
  if (projectNames.length === 0) {
    throw new Error(
      "Nx returned no projects while resolving released environments",
    );
  }

  const matchedProjects = new Set<string>();
  const unmatchedTags: string[] = [];
  for (const entry of tagEntries) {
    const projectName = matchProjectName(entry.tag, projectNames);
    if (projectName) {
      matchedProjects.add(projectName);
    } else {
      unmatchedTags.push(entry.tag);
    }
  }

  if (unmatchedTags.length > 0) {
    throw new Error(
      `Could not match released tags to Nx projects: ${unmatchedTags.join(", ")}`,
    );
  }

  console.error(
    `Filtering environment projects from ${matchedProjects.size} matched projects`,
  );
  const environmentTargets: EnvironmentTarget[] = [];
  for (const projectName of matchedProjects) {
    const projectRoot = await getNxProjectRoot(projectName);
    if (!projectRoot) {
      throw new Error(
        `Could not resolve the root for Nx project "${projectName}"`,
      );
    }

    const environmentTarget = await readEnvironmentTarget(
      projectName,
      projectRoot,
    );
    if (environmentTarget) {
      environmentTargets.push(environmentTarget);
      console.error(`✓ ${projectName} is an environment project`);
    } else {
      console.error(`✗ ${projectName} is not an environment project, skipping`);
    }
  }

  if (environmentTargets.length === 0) {
    console.error("No released environment projects found to apply");
    process.stdout.write(emptyMatrix);
    return;
  }

  const matrix = JSON.stringify(environmentTargets);
  console.error(
    `Environment projects to apply: ${environmentTargets.map(({ project }) => project).join(",")}`,
  );
  process.stdout.write(matrix);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err: unknown) => {
    console.error("Unexpected error in extract-infra-projects-to-apply:", err);
    process.exit(1);
  });
}
