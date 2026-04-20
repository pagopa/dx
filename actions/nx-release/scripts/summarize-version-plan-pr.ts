/**
 * Entrypoint for the PR mode of nx-release. It detects version plan files in
 * the current pull request and upserts a managed summary comment.
 */
import { appendFile, readFile } from "node:fs/promises";
import { z } from "zod";

import { createOctokit, getRepoInfo } from "./shared.js";
import {
  isManagedVersionPackagesPullRequest,
  listPullRequestFiles,
  parseVersionPlanFile,
  renderVersionPlanComment,
  selectRelevantVersionPlanFiles,
  syncVersionPlanSummaryComment,
} from "./version-plan-pr-comment.js";

const PullRequestEventSchema = z.object({
  pull_request: z.object({
    head: z.object({
      ref: z.string(),
      repo: z.object({ full_name: z.string() }),
      sha: z.string(),
    }),
    number: z.number().int().positive(),
    title: z.string(),
  }),
});

export async function run(): Promise<void> {
  const pullRequest = await loadPullRequestContext();
  const { owner, repo } = await getRepoInfo();
  const octokit = createOctokit();

  if (
    isManagedVersionPackagesPullRequest({
      headRefName: pullRequest.head.ref,
      title: pullRequest.title,
    })
  ) {
    console.log("Skipping summary comment on the managed Version Packages PR.");
    await syncVersionPlanSummaryComment({
      commentBody: null,
      octokit,
      owner,
      pullRequestNumber: pullRequest.number,
      repo,
    });
    return;
  }

  const pullRequestFiles = await listPullRequestFiles(
    octokit,
    owner,
    repo,
    pullRequest.number,
  );
  const relevantVersionPlanPaths =
    selectRelevantVersionPlanFiles(pullRequestFiles);

  if (relevantVersionPlanPaths.length === 0) {
    console.log("No active version plan files found in this pull request.");
    await syncVersionPlanSummaryComment({
      commentBody: null,
      octokit,
      owner,
      pullRequestNumber: pullRequest.number,
      repo,
    });
    return;
  }

  const versionPlanFiles = await Promise.all(
    relevantVersionPlanPaths.map(async (versionPlanPath) => {
      const fileContent = await readFile(versionPlanPath, "utf8");
      return parseVersionPlanFile(versionPlanPath, fileContent);
    }),
  );

  const commentBody = renderVersionPlanComment({
    commitSha: pullRequest.head.sha,
    owner,
    repo,
    versionPlanFiles,
  });
  const managedComment = await syncVersionPlanSummaryComment({
    commentBody,
    octokit,
    owner,
    pullRequestNumber: pullRequest.number,
    repo,
  });

  if (!managedComment) {
    return;
  }

  console.log(
    `Version plan summary comment ${managedComment.operation}: ${managedComment.commentUrl}`,
  );

  await appendOutput("summary-comment-id", managedComment.commentId.toString());
  await appendOutput("summary-comment-url", managedComment.commentUrl);
}

async function appendOutput(key: string, value: string): Promise<void> {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }

  await appendFile(outputPath, `${key}=${value}\n`);
}

async function loadPullRequestContext(): Promise<
  z.infer<typeof PullRequestEventSchema>["pull_request"]
> {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    throw new Error("GITHUB_EVENT_PATH environment variable is required");
  }

  const rawEventPayload = await readFile(eventPath, "utf8");
  let parsedPayload: unknown;

  try {
    parsedPayload = JSON.parse(rawEventPayload);
  } catch (error) {
    throw new Error("Failed to parse GITHUB_EVENT_PATH payload", {
      cause: error,
    });
  }

  const parsedEvent = PullRequestEventSchema.safeParse(parsedPayload);
  if (!parsedEvent.success) {
    throw new Error(
      `Pull request payload validation failed: ${parsedEvent.error.message}`,
    );
  }

  return parsedEvent.data.pull_request;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error: unknown) => {
    console.error("Unexpected error in summarize-version-plan-pr:", error);
    process.exit(1);
  });
}
