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
  isEnvironmentProject,
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
  runnerLabel: string;
}

const emptyMatrix = "[]";

const inferDeploymentMetadata = (
  projectRoot: string,
): Omit<EnvironmentTarget, "project"> => {
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
): Promise<EnvironmentTarget> => {
  const projectRoot = await getNxProjectRoot(project);
  if (!projectRoot) {
    throw new Error(`Could not resolve the root for Nx project "${project}"`);
  }

  const manifestPath = path.join(projectRoot, "environment.json");
  const rawManifest = await fs.readFile(manifestPath, "utf8");
  const parsedManifest: unknown = JSON.parse(rawManifest);
  const parseResult = environmentManifestSchema.safeParse(parsedManifest);

  if (!parseResult.success) {
    throw new Error(
      `Invalid deployment metadata in "${manifestPath}": ${parseResult.error.issues.map((issue) => issue.message).join("; ")}`,
    );
  }

  return {
    project,
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
    console.error(
      "::warning::PR body is empty, no environment projects to apply",
    );
    process.stdout.write(emptyMatrix);
    return;
  }

  const tagEntries = extractTagEntriesFromPRBody(pr.body);

  if (tagEntries.length === 0) {
    console.error(
      "::warning::No nx-release-tags metadata found in PR body, no environment projects to apply",
    );
    process.stdout.write(emptyMatrix);
    return;
  }

  const projectNames = await getNxProjectNames();
  if (projectNames.length === 0) {
    console.error("::warning::No Nx projects found in workspace");
    process.stdout.write(emptyMatrix);
    return;
  }

  const matchedProjects = new Set<string>();
  for (const entry of tagEntries) {
    const projectName = matchProjectName(entry.tag, projectNames);
    if (projectName) {
      matchedProjects.add(projectName);
    } else {
      console.error(
        `::warning::Could not match tag ${entry.tag} to any Nx project`,
      );
    }
  }

  if (matchedProjects.size === 0) {
    console.error("::warning::No projects extracted from tags");
    process.stdout.write(emptyMatrix);
    return;
  }

  console.error(
    `Filtering environment projects from ${matchedProjects.size} matched projects`,
  );
  const environmentTargets: EnvironmentTarget[] = [];
  for (const projectName of matchedProjects) {
    const isEnvironment = await isEnvironmentProject(projectName);
    if (isEnvironment) {
      environmentTargets.push(await readEnvironmentTarget(projectName));
      console.error(`✓ ${projectName} is an environment project`);
    } else {
      console.error(`✗ ${projectName} is not an environment project, skipping`);
    }
  }

  if (environmentTargets.length === 0) {
    console.error("::warning::No environment projects found to apply");
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
