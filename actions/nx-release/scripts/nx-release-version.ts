/**
 * Runs the Nx Release versioning and changelog generation phases via the
 * programmatic API, then writes the formatted PR body to the path specified
 * by the PR_BODY_PATH environment variable.
 *
 * Expected environment variables:
 *   GITHUB_OUTPUT  — path to GitHub Actions output file
 *   PR_BODY_PATH   — file path where the generated PR body should be written
 *                    (written only when version changes are detected)
 */
import type { releaseChangelog, releaseVersion } from "nx/release";

import { appendFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** Writes an output key/value for downstream GitHub Action steps. */
async function appendOutput(
  outputPath: string,
  key: string,
  value: string,
): Promise<void> {
  await appendFile(outputPath, `${key}=${value}\n`);
}

/** Builds the PR body using changelog entry contents returned by Nx Release. */
function buildPrBody(
  projectChangelogs: Record<string, { contents: string }> | undefined,
): string {
  const intro = [
    "This PR was opened by the [Nx Release](https://github.com/pagopa/dx/tree/main/actions/nx-release) GitHub Action. When you're ready to do a release, you can merge this and the packages will be published to npm automatically. If you're not ready to do a release yet, that's fine, whenever you add more Nx version plans to main, this PR will be updated.",
    "",
    "# Releases",
    "",
  ].join("\n");

  const entries = Object.entries(projectChangelogs ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, data]) => data.contents.trim())
    .filter(Boolean);

  return entries.length > 0
    ? `${intro}${entries.join("\n\n")}`.trim()
    : `${intro}See individual packages CHANGELOGs for details.`;
}

/**
 * Loads nx/release from the consumer workspace's node_modules.
 * A dynamic import with an explicit file:// URL is required because Node.js
 * ESM resolves static imports relative to the *source file* location, which
 * on GitHub Actions runners is inside the isolated _actions/ directory —
 * not the consumer workspace that has nx installed.
 */
async function loadNxRelease(): Promise<{
  releaseChangelog: typeof releaseChangelog;
  releaseVersion: typeof releaseVersion;
}> {
  const workspaceRoot = process.env.GITHUB_WORKSPACE ?? process.cwd();
  const nxReleasePath = pathToFileURL(
    join(workspaceRoot, "node_modules/nx/release/index.js"),
  ).href;
  return import(nxReleasePath) as Promise<{
    releaseChangelog: typeof releaseChangelog;
    releaseVersion: typeof releaseVersion;
  }>;
}

/** Main entrypoint: runs versioning + changelog via Nx Release programmatic API. */
async function run(): Promise<void> {
  const outputPath = process.env.GITHUB_OUTPUT;
  const prBodyPath = process.env.PR_BODY_PATH;

  const { releaseChangelog, releaseVersion } = await loadNxRelease();

  console.log("::notice::Running Nx Release versioning phase");
  const { projectsVersionData, releaseGraph, workspaceVersion } =
    await releaseVersion({ preid: "rc" });

  const hasChanges = Object.values(projectsVersionData).some(
    (v) => v.newVersion !== null && v.newVersion !== v.currentVersion,
  );

  if (!hasChanges) {
    console.log(
      "::notice::No version changes produced by Nx release. Skipping PR update.",
    );
    if (outputPath) {
      await appendOutput(outputPath, "has-changes", "false");
    }
    return;
  }

  if (outputPath) {
    await appendOutput(outputPath, "has-changes", "true");
  }

  console.log("::notice::Running Nx Release changelog phase");
  const { projectChangelogs } = await releaseChangelog({
    releaseGraph,
    version: workspaceVersion,
    versionData: projectsVersionData,
  });

  const body = buildPrBody(
    projectChangelogs as Record<string, { contents: string }> | undefined,
  );

  if (prBodyPath) {
    await writeFile(prBodyPath, body, "utf8");
    console.log(`::notice::PR body written to ${prBodyPath}`);
  }
}

// Only execute when run directly as a script, not when imported in tests
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err: unknown) => {
    console.error("Unexpected error in nx-release-version:", err);
    process.exit(1);
  });
}
