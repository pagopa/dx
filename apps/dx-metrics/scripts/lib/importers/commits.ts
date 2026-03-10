/** This module imports commit-derived metrics and IaC lead time data. */

import * as schema from "../../../src/db/schema";
import type { ImportContext } from "../import-context";
import { formatSecondsElapsed, sleep } from "../importer-helpers";

const getCommitterLogin = (value: unknown): string | null => {
  if (typeof value !== "object" || value === null || !("login" in value)) {
    return null;
  }

  return typeof value.login === "string" ? value.login : null;
};

export async function importIacPrLeadTime(
  context: ImportContext,
  repoName: string,
  since: string,
): Promise<void> {
  if (repoName === context.dxRepo) {
    return;
  }

  const startTime = Date.now();
  const repoId = await context.ensureRepo(repoName);
  const fullName = `${context.organization}/${repoName}`;
  console.log(`  Importing IaC PR lead time for ${fullName}...`);

  const targetAuthors = context.dxTeamMembers.map((author) =>
    author.toLowerCase(),
  );
  const filePath = "infra";

  let allCommits;
  try {
    let fetchedCommits = 0;
    allCommits = await context.octokit.paginate(
      context.octokit.rest.repos.listCommits,
      {
        owner: context.organization,
        repo: repoName,
        path: filePath,
        since,
        per_page: 100,
      },
      (response) => {
        fetchedCommits += response.data.length;
        process.stdout.write(`\r    Fetching commits: ${fetchedCommits}...`);
        return response.data;
      },
    );
    process.stdout.write(`\r    Fetched ${fetchedCommits} commits\n`);
  } catch {
    console.log(`    ⚠ No commits found for path ${filePath}`);
    return;
  }

  const pullRequestMap = new Map<
    number,
    {
      number: number;
      title: string;
      author: string;
      createdAt: string;
      mergedAt: string;
      leadTimeDays: number;
    }
  >();
  const pullRequestReviewers = new Map<number, Set<string>>();

  console.log(`    Analyzing ${allCommits.length} commits...`);
  let processedCommits = 0;
  for (const commit of allCommits) {
    const commitAuthor = commit.author?.login?.toLowerCase();
    const isTargetAuthor =
      typeof commitAuthor === "string" && targetAuthors.includes(commitAuthor);

    let pullRequests;
    try {
      pullRequests =
        await context.octokit.rest.repos.listPullRequestsAssociatedWithCommit({
          owner: context.organization,
          repo: repoName,
          commit_sha: commit.sha,
        });
    } catch {
      continue;
    }

    for (const pullRequest of pullRequests.data) {
      if (
        isTargetAuthor &&
        commitAuthor &&
        commitAuthor !== pullRequest.user?.login?.toLowerCase()
      ) {
        const reviewers = pullRequestReviewers.get(pullRequest.number);
        if (reviewers) {
          reviewers.add(commitAuthor);
        } else {
          pullRequestReviewers.set(pullRequest.number, new Set([commitAuthor]));
        }
      }

      if (pullRequest.merged_at && !pullRequestMap.has(pullRequest.number)) {
        const createdAt = new Date(pullRequest.created_at);
        const mergedAt = new Date(pullRequest.merged_at);
        const leadTimeDays =
          (mergedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

        pullRequestMap.set(pullRequest.number, {
          number: pullRequest.number,
          title: pullRequest.title,
          author: pullRequest.user?.login || "unknown",
          createdAt: pullRequest.created_at,
          mergedAt: pullRequest.merged_at,
          leadTimeDays,
        });
      }
    }

    processedCommits += 1;
    if (processedCommits % 10 === 0) {
      process.stdout.write(
        `\r    Analyzed: ${processedCommits}/${allCommits.length} commits, found ${pullRequestMap.size} PRs`,
      );
    }

    await sleep(50);
  }

  if (processedCommits > 0) {
    process.stdout.write(
      `\r    Analyzed: ${processedCommits}/${allCommits.length} commits, found ${pullRequestMap.size} PRs\n`,
    );
  }

  let importedCount = 0;
  for (const pullRequest of pullRequestMap.values()) {
    const reviewers = Array.from(
      pullRequestReviewers.get(pullRequest.number) ?? [],
    ).filter((author) => author !== "web-flow");

    await context.db
      .insert(schema.iacPrLeadTimes)
      .values({
        repositoryId: repoId,
        repositoryFullName: fullName,
        prNumber: pullRequest.number,
        title: pullRequest.title,
        author: pullRequest.author,
        createdAt: new Date(pullRequest.createdAt),
        mergedAt: new Date(pullRequest.mergedAt),
        leadTimeDays: pullRequest.leadTimeDays.toFixed(2),
        targetAuthors: reviewers,
      })
      .onConflictDoUpdate({
        target: [
          schema.iacPrLeadTimes.repositoryId,
          schema.iacPrLeadTimes.prNumber,
        ],
        set: {
          title: pullRequest.title,
          mergedAt: new Date(pullRequest.mergedAt),
          leadTimeDays: pullRequest.leadTimeDays.toFixed(2),
          targetAuthors: reviewers,
        },
      });

    importedCount += 1;
  }

  console.log(
    `    ✓ ${importedCount} IaC PR lead times imported in ${formatSecondsElapsed(startTime)}s`,
  );
}

export async function importCommitsForMember(
  context: ImportContext,
  member: string,
  since: string,
): Promise<void> {
  const startTime = Date.now();
  const sinceDate = new Date(since);
  const query = `org:${context.organization} committer-date:${sinceDate.toISOString().split("T")[0]}..${new Date().toISOString().split("T")[0]} author:${member}`;

  try {
    let fetchedCount = 0;
    const results = await context.octokit.paginate(
      context.octokit.rest.search.commits,
      {
        q: query,
        per_page: 100,
      },
      (response) => {
        fetchedCount += response.data.length;
        process.stdout.write(
          `\r      Fetching commits for ${member}: ${fetchedCount}...`,
        );
        return response.data;
      },
    );
    process.stdout.write(
      `\r      Fetched ${fetchedCount} commits for ${member}\n`,
    );

    let importedCount = 0;
    for (const result of results) {
      const repositoryFullName = result.repository?.full_name;
      if (!repositoryFullName) {
        continue;
      }

      const repoName = repositoryFullName.split("/")[1];
      if (!repoName) {
        continue;
      }

      let repoId: number;
      try {
        repoId = await context.ensureRepo(repoName);
      } catch {
        continue;
      }

      await context.db
        .insert(schema.commits)
        .values({
          sha: result.sha,
          repositoryId: repoId,
          repositoryFullName,
          author: result.author?.login || null,
          committer: getCommitterLogin(result.committer),
          committerDate: result.commit?.committer?.date
            ? new Date(result.commit.committer.date)
            : null,
          message: result.commit?.message?.slice(0, 500) || null,
        })
        .onConflictDoNothing();

      importedCount += 1;
    }

    console.log(
      `    ✓ ${member}: ${importedCount} commits imported in ${formatSecondsElapsed(startTime)}s`,
    );
  } catch (error) {
    console.log(`    ⚠ ${member}: search failed - ${error}`);
    throw error;
  }

  await sleep(2000);
}
