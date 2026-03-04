import { writeFile, appendFile } from 'fs/promises';
import { join } from 'path';
import { pathToFileURL } from 'url';

// scripts/nx-release-version.ts
function buildPrBody(projectChangelogs) {
  const intro = [
    "This PR was opened by the [Nx Release](https://github.com/pagopa/dx/tree/main/actions/nx-release) GitHub Action. When you're ready to do a release, you can merge this and the packages will be published to npm automatically. If you're not ready to do a release yet, that's fine, whenever you add more Nx version plans to main, this PR will be updated.",
    "",
    "# Releases",
    ""
  ].join("\n");
  const entries = Object.entries(projectChangelogs ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([, data]) => data.contents.trim()).filter(Boolean);
  return entries.length > 0 ? `${intro}${entries.join("\n\n")}`.trim() : `${intro}See individual packages CHANGELOGs for details.`;
}
async function appendOutput(outputPath, key, value) {
  await appendFile(outputPath, `${key}=${value}
`);
}
async function loadNxRelease() {
  const workspaceRoot = process.env.GITHUB_WORKSPACE ?? process.cwd();
  const nxReleasePath = pathToFileURL(
    join(workspaceRoot, "node_modules/nx/release/index.js")
  ).href;
  return import(nxReleasePath);
}
async function run() {
  const outputPath = process.env.GITHUB_OUTPUT;
  const prBodyPath = process.env.PR_BODY_PATH;
  const { releaseChangelog, releaseVersion } = await loadNxRelease();
  console.log("::notice::Running Nx Release versioning phase");
  const { projectsVersionData, releaseGraph, workspaceVersion } = await releaseVersion({ preid: "rc" });
  const hasChanges = Object.values(projectsVersionData).some(
    (v) => v.newVersion !== null && v.newVersion !== v.currentVersion
  );
  if (!hasChanges) {
    console.log(
      "::notice::No version changes produced by Nx release. Skipping PR update."
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
    // Disable all git operations — action.yaml handles the commit/push
    // so that lockfile refresh can happen between changelog and commit.
    // Tags and GitHub releases are created after publish, not here.
    createRelease: false,
    gitCommit: false,
    gitTag: false,
    releaseGraph,
    version: workspaceVersion,
    versionData: projectsVersionData
  });
  const body = buildPrBody(
    projectChangelogs
  );
  if (prBodyPath) {
    await writeFile(prBodyPath, body, "utf8");
    console.log(`::notice::PR body written to ${prBodyPath}`);
  }
}
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error("Unexpected error in nx-release-version:", err);
    process.exit(1);
  });
}

export { buildPrBody };
