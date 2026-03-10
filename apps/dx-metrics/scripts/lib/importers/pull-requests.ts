/** This module imports GitHub pull requests and their reviews. */

import { sql } from "drizzle-orm";
import * as schema from "../../../src/db/schema";
import type { ImportContext } from "../import-context";
import { formatSecondsElapsed, sleep } from "../importer-helpers";

const BOT_LOGINS = new Set(["renovate-pagopa", "dependabot", "dx-pagopa-bot"]);

export async function importPullRequests(
  context: ImportContext,
  repoName: string,
  since: string,
): Promise<void> {
  const startTime = Date.now();
  const repoId = await context.ensureRepo(repoName);
  const fullName = `${context.organization}/${repoName}`;
  console.log(`  Importing pull requests for ${fullName}...`);

  let fetchedCount = 0;
  const pullRequests = await context.octokit.paginate(
    context.octokit.rest.pulls.list,
    {
      owner: context.organization,
      repo: repoName,
      state: "all",
      sort: "updated",
      direction: "desc",
      per_page: 100,
    },
    (response) => {
      fetchedCount += response.data.length;
      process.stdout.write(`\r    Fetching PRs: ${fetchedCount}...`);
      return response.data;
    },
  );
  process.stdout.write(`\r    Fetched ${fetchedCount} PRs total\n`);

  const sinceDate = new Date(since);
  const filteredPullRequests = pullRequests.filter(
    (pullRequest) => new Date(pullRequest.updated_at) >= sinceDate,
  );

  console.log(
    `    Processing ${filteredPullRequests.length} PRs since ${since}...`,
  );
  let importedCount = 0;
  for (const pullRequest of filteredPullRequests) {
    await context.db
      .insert(schema.pullRequests)
      .values({
        id: pullRequest.id,
        repositoryId: repoId,
        number: pullRequest.number,
        title: pullRequest.title,
        author: pullRequest.user?.login || null,
        reviewDecision: null,
        createdAt: new Date(pullRequest.created_at),
        closedAt: pullRequest.closed_at ? new Date(pullRequest.closed_at) : null,
        mergedAt: pullRequest.merged_at ? new Date(pullRequest.merged_at) : null,
        mergedBy: null,
        additions: null,
        totalCommentsCount: null,
        draft: pullRequest.draft ? 1 : 0,
      })
      .onConflictDoUpdate({
        target: schema.pullRequests.id,
        set: {
          title: pullRequest.title,
          closedAt: pullRequest.closed_at
            ? new Date(pullRequest.closed_at)
            : null,
          mergedAt: pullRequest.merged_at
            ? new Date(pullRequest.merged_at)
            : null,
          draft: pullRequest.draft ? 1 : 0,
        },
      });

    importedCount += 1;
    if (importedCount % 10 === 0) {
      process.stdout.write(
        `\r    Imported: ${importedCount}/${filteredPullRequests.length}`,
      );
    }
  }

  if (importedCount > 0) {
    process.stdout.write(
      `\r    Imported: ${importedCount}/${filteredPullRequests.length}\n`,
    );
  }

  const pullRequestsNeedingDetails = await context.db
    .select()
    .from(schema.pullRequests)
    .where(
      sql`${schema.pullRequests.repositoryId} = ${repoId}
          AND (${schema.pullRequests.additions} IS NULL
               OR ${schema.pullRequests.totalCommentsCount} IS NULL)
          AND ${schema.pullRequests.createdAt} >= ${since}`,
    );

  if (pullRequestsNeedingDetails.length > 0) {
    console.log(
      `    Fetching details for ${pullRequestsNeedingDetails.length} PRs...`,
    );
  }

  let detailsCount = 0;
  for (const pullRequest of pullRequestsNeedingDetails) {
    try {
      const { data: detail } = await context.octokit.rest.pulls.get({
        owner: context.organization,
        repo: repoName,
        pull_number: pullRequest.number,
      });

      await context.db
        .update(schema.pullRequests)
        .set({
          additions: detail.additions,
          mergedBy: detail.merged_by?.login || null,
          reviewDecision: null,
          totalCommentsCount:
            (detail.comments || 0) + (detail.review_comments || 0),
        })
        .where(sql`${schema.pullRequests.id} = ${pullRequest.id}`);

      detailsCount += 1;
      if (detailsCount % 5 === 0) {
        process.stdout.write(
          `\r    Details fetched: ${detailsCount}/${pullRequestsNeedingDetails.length}`,
        );
      }
    } catch {
      // Preserve the original behavior: skip transient errors while backfilling details.
    }

    await sleep(100);
  }

  if (detailsCount > 0) {
    process.stdout.write(
      `\r    Details fetched: ${detailsCount}/${pullRequestsNeedingDetails.length}\n`,
    );
  }

  console.log(
    `    ✓ ${importedCount} pull requests imported in ${formatSecondsElapsed(startTime)}s`,
  );
}

export async function importPullRequestReviews(
  context: ImportContext,
  repoName: string,
  since: string,
): Promise<void> {
  const startTime = Date.now();
  const repoId = await context.ensureRepo(repoName);
  const fullName = `${context.organization}/${repoName}`;
  console.log(`  Importing PR reviews for ${fullName}...`);

  const pullRequests = await context.db
    .select({ id: schema.pullRequests.id, number: schema.pullRequests.number })
    .from(schema.pullRequests)
    .where(
      sql`repository_id = ${repoId}
          AND created_at >= ${new Date(since)}
          AND merged_at IS NOT NULL`,
    );

  let importedReviews = 0;
  let processedPullRequests = 0;
  for (const pullRequest of pullRequests) {
    processedPullRequests += 1;
    if (processedPullRequests % 50 === 0) {
      process.stdout.write(
        `\r    Processing PR ${processedPullRequests}/${pullRequests.length}...`,
      );
    }

    try {
      const reviews = await context.octokit.rest.pulls.listReviews({
        owner: context.organization,
        repo: repoName,
        pull_number: pullRequest.number,
        per_page: 100,
      });

      for (const review of reviews.data) {
        const login = review.user?.login;
        if (!login || BOT_LOGINS.has(login)) {
          continue;
        }

        await context.db
          .insert(schema.pullRequestReviews)
          .values({
            id: review.id,
            pullRequestId: pullRequest.id,
            repositoryId: repoId,
            reviewer: login,
            state: review.state,
            submittedAt: review.submitted_at
              ? new Date(review.submitted_at)
              : null,
          })
          .onConflictDoUpdate({
            target: schema.pullRequestReviews.id,
            set: {
              state: review.state,
              submittedAt: review.submitted_at
                ? new Date(review.submitted_at)
                : null,
            },
          });

        importedReviews += 1;
      }
    } catch (error) {
      console.log(
        `\n    ⚠ listReviews failed for PR #${pullRequest.number}: ${error}`,
      );
    }

    await sleep(100);
  }

  if (processedPullRequests > 0) {
    process.stdout.write("\n");
  }

  console.log(
    `    ✓ ${importedReviews} reviews imported for ${pullRequests.length} PRs in ${formatSecondsElapsed(startTime)}s`,
  );
}
