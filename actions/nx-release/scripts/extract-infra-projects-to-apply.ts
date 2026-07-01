/**
 * Extracts Terraform environment project names from the merged Version Packages
 * PR body to determine which deployable infrastructure projects should be
 * applied after release metadata is merged.
 *
 * Reads the nx-release-tags metadata comment from the PR body and outputs a
 * comma-separated list of environment project names to stdout.
 */
import {
  createOctokit,
  extractTagEntriesFromPRBody,
  getNxProjectNames,
  getRepoInfo,
  isEnvironmentProject,
  matchProjectName,
} from "./shared.js";

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
    process.stdout.write("");
    return;
  }

  const tagEntries = extractTagEntriesFromPRBody(pr.body);

  if (tagEntries.length === 0) {
    console.error(
      "::warning::No nx-release-tags metadata found in PR body, no environment projects to apply",
    );
    process.stdout.write("");
    return;
  }

  const projectNames = await getNxProjectNames();
  if (projectNames.length === 0) {
    console.error("::warning::No Nx projects found in workspace");
    process.stdout.write("");
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
    process.stdout.write("");
    return;
  }

  console.error(
    `Filtering environment projects from ${matchedProjects.size} matched projects`,
  );
  const environmentProjects: string[] = [];
  for (const projectName of matchedProjects) {
    const isEnvironment = await isEnvironmentProject(projectName);
    if (isEnvironment) {
      environmentProjects.push(projectName);
      console.error(`✓ ${projectName} is an environment project`);
    } else {
      console.error(`✗ ${projectName} is not an environment project, skipping`);
    }
  }

  if (environmentProjects.length === 0) {
    console.error("::warning::No environment projects found to apply");
    process.stdout.write("");
    return;
  }

  const projectsList = environmentProjects.join(",");
  console.error(`Environment projects to apply: ${projectsList}`);
  process.stdout.write(projectsList);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err: unknown) => {
    console.error("Unexpected error in extract-infra-projects-to-apply:", err);
    process.exit(1);
  });
}
