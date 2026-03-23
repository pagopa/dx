/**
 * Extracts project names from the merged Version Packages PR body to determine
 * which projects need to be built before publishing.
 *
 * Reads the nx-release-tags metadata comment from the PR body and outputs
 * a comma-separated list of PUBLIC project names to stdout.
 * Private projects are filtered out to avoid publish errors.
 */
import {
  createOctokit,
  extractTagEntriesFromPRBody,
  getNxProjectNames,
  getRepoInfo,
  isPublicProject,
  matchProjectName,
} from "./shared.js";

/** Main entrypoint: fetches PR, extracts tags, outputs project names. */
async function run(): Promise<void> {
  const prNumber = process.env.PR_NUMBER;
  if (!prNumber) {
    throw new Error("PR_NUMBER environment variable is required");
  }

  const octokit = createOctokit();
  const { owner, repo } = await getRepoInfo();

  console.error(`Fetching PR #${prNumber} to extract release tags`);

  // Fetch the merged PR
  const { data: pr } = await octokit.pulls.get({
    owner,
    pull_number: parseInt(prNumber, 10),
    repo,
  });

  if (!pr.body) {
    console.error("::warning::PR body is empty, no projects to build");
    process.stdout.write("");
    return;
  }

  // Extract tag entries from PR body using shared utility
  const tagEntries = extractTagEntriesFromPRBody(pr.body);

  if (tagEntries.length === 0) {
    console.error(
      "::warning::No nx-release-tags metadata found in PR body, no projects to build",
    );
    process.stdout.write("");
    return;
  }

  // Get all Nx project names to match tags against
  const projectNames = await getNxProjectNames();
  if (projectNames.length === 0) {
    console.error("::warning::No Nx projects found in workspace");
    process.stdout.write("");
    return;
  }

  // Extract unique project names using the correct matching logic
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

  // Filter only public projects (to avoid publishing private packages)
  console.error(
    `Filtering public projects from ${matchedProjects.size} matched projects`,
  );
  const publicProjects: string[] = [];
  for (const projectName of matchedProjects) {
    const isPublic = await isPublicProject(projectName);
    if (isPublic) {
      publicProjects.push(projectName);
      console.error(`✓ ${projectName} is public`);
    } else {
      console.error(`✗ ${projectName} is private, skipping`);
    }
  }

  if (publicProjects.length === 0) {
    console.error("::warning::No public projects found to build");
    process.stdout.write("");
    return;
  }

  const projectsList = publicProjects.join(",");
  console.error(`Public projects to build: ${projectsList}`);
  process.stdout.write(projectsList);
}

// Only execute when run directly as a script, not when imported in tests
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err: unknown) => {
    console.error("Unexpected error in extract-projects-to-build:", err);
    process.exit(1);
  });
}
