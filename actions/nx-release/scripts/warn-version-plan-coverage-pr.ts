/**
 * Entrypoint for warning pull requests based on the official
 * `nx release plan:check` result.
 */
import { execFile, type ExecFileException } from "node:child_process";
import { readFile } from "node:fs/promises";
import { z } from "zod";

import { createOctokit, getRepoInfo } from "./shared.js";
import {
  isManagedVersionPackagesPullRequest,
  renderVersionPlanWarningComment,
  syncVersionPlanWarningComment,
} from "./version-plan-coverage-pr-comment.js";

const PullRequestEventSchema = z.object({
  pull_request: z.object({
    base: z.object({ sha: z.string() }),
    head: z.object({
      ref: z.string(),
      repo: z.object({ full_name: z.string() }),
      sha: z.string(),
    }),
    number: z.number().int().positive(),
    title: z.string(),
  }),
});

const ANSI_ESCAPE_PATTERN = new RegExp(
  String.raw`\u001B\[[0-?]*[ -/]*[@-~]`,
  "g",
);

type PullRequestContext = z.infer<
  typeof PullRequestEventSchema
>["pull_request"];

export async function run(): Promise<void> {
  const pullRequest = await loadPullRequestContext();
  const { owner, repo } = await getRepoInfo();
  const octokit = createOctokit();

  let commentBody: null | string;

  if (
    isManagedVersionPackagesPullRequest({
      headRefName: pullRequest.head.ref,
      title: pullRequest.title,
    })
  ) {
    console.log("Skipping warning comment on the managed Version Packages PR.");
    commentBody = null;
  } else {
    commentBody = await buildWarningCommentBody({
      baseSha: process.env.NX_BASE || pullRequest.base.sha,
      headSha: process.env.NX_HEAD || pullRequest.head.sha,
    });
  }

  const managedComment = await syncVersionPlanWarningComment({
    commentBody,
    octokit,
    owner,
    pullRequestNumber: pullRequest.number,
    repo,
  });

  if (!managedComment) {
    console.log("No version plan warning comment change was required.");
    return;
  }

  console.log(
    `Version plan warning comment ${managedComment.operation}: ${managedComment.commentUrl}`,
  );
}

async function buildWarningCommentBody(params: {
  baseSha: string;
  headSha: string;
}): Promise<null | string> {
  const nxPlanCheckOutput = await runNxReleasePlanCheck(params);

  return nxPlanCheckOutput
    ? renderVersionPlanWarningComment({
        nxPlanCheckOutput,
      })
    : null;
}

async function execFileWithExitCode(
  command: string,
  args: string[],
): Promise<{ exitCode: number; stderr: string; stdout: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        env: {
          ...process.env,
          FORCE_COLOR: "0",
        },
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (!error) {
          resolve({
            exitCode: 0,
            stderr,
            stdout,
          });
          return;
        }

        const exitCode = (error as ExecFileException).code;
        if (typeof exitCode === "number") {
          resolve({
            exitCode,
            stderr,
            stdout,
          });
          return;
        }

        reject(
          new Error(`Failed to execute ${command} ${args.join(" ")}`, {
            cause: error,
          }),
        );
      },
    );
  });
}

async function loadPullRequestContext(): Promise<PullRequestContext> {
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

function normalizeCommandOutput(output: string): string {
  return output.replace(ANSI_ESCAPE_PATTERN, "").trim();
}

async function runNxReleasePlanCheck(params: {
  baseSha: string;
  headSha: string;
}): Promise<null | string> {
  const result = await execFileWithExitCode("pnpm", [
    "nx",
    "release",
    "plan:check",
    "--base",
    params.baseSha,
    "--head",
    params.headSha,
  ]);
  const output = normalizeCommandOutput(
    [result.stdout, result.stderr].filter(Boolean).join("\n"),
  );

  if (result.exitCode === 0) {
    return null;
  }

  if (output.includes("Touched projects missing version plans")) {
    return output;
  }

  throw new Error(
    output.length > 0
      ? `nx release plan:check failed unexpectedly:\n${output}`
      : "nx release plan:check failed unexpectedly",
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error: unknown) => {
    console.error("Unexpected error in warn-version-plan-coverage-pr:", error);
    process.exit(1);
  });
}
