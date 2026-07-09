// Best-effort GitHub Actions job summary reporting for Docker build/push
// outcomes (pushed image tags, build/push failures), so reviewers can see
// what happened without opening the raw job logs — mirroring how this
// repo's Terraform tooling surfaces plan outcomes alongside CI runs.
// `GITHUB_STEP_SUMMARY` is only set inside an actual GitHub Actions job, so
// this is a silent no-op for local `nx run` invocations.
import { appendFileSync } from "node:fs";

const appendSummary = (markdown: string): void => {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFile) {
    return;
  }
  try {
    appendFileSync(summaryFile, `${markdown}\n`);
  } catch (err) {
    // A summary write failure must never fail the actual build/push.
    console.warn(
      "[@pagopa/nx-dx-docker-plugin] Could not write to GITHUB_STEP_SUMMARY",
      err,
    );
  }
};

export const summarizeDockerPush = (
  projectDisplayName: string,
  imageName: string,
  tags: readonly string[],
): void => {
  const tagList = tags.map((tag) => `- \`${imageName}:${tag}\``).join("\n");
  appendSummary(`### 🐳 ${projectDisplayName} — image pushed\n\n${tagList}`);
};

export const summarizeDockerFailure = (
  projectDisplayName: string,
  action: "build" | "push",
  exitCode: number,
): void => {
  appendSummary(
    `### ❌ ${projectDisplayName} — docker ${action} failed (exit code ${exitCode})`,
  );
};
