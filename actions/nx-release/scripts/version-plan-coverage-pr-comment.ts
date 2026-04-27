/**
 * Pure helpers for rendering and synchronizing the managed version plan
 * warning comment shown on pull requests.
 */
import { z } from "zod";

export const VERSION_PLAN_GUIDE_URL =
  "https://dx.pagopa.it/docs/github/pull-requests/version-plan";
export const VERSION_PLAN_WARNING_MARKER =
  "<!-- nx-release-version-plan-warning -->";

const COMMENT_PAGE_SIZE = 100;
const MANAGED_VERSION_PACKAGES_BRANCH = "nx-release/main";
const MANAGED_VERSION_PACKAGES_TITLE = "Version Packages";

const PullRequestCommentSchema = z.object({
  body: z.string().nullable().optional(),
  html_url: z.string(),
  id: z.number().int().positive(),
});

export interface ManagedCommentResult {
  commentId: number;
  commentUrl: string;
  operation: "created" | "deleted" | "noop" | "updated";
}

export interface PullRequestComment {
  body?: null | string;
  html_url: string;
  id: number;
}

export interface PullRequestCommentOperations {
  createComment(params: {
    body: string;
    issue_number: number;
    owner: string;
    repo: string;
  }): Promise<{ data: PullRequestComment }>;
  deleteComment(params: {
    comment_id: number;
    owner: string;
    repo: string;
  }): Promise<unknown>;
  listComments(params: {
    issue_number: number;
    owner: string;
    page: number;
    per_page: number;
    repo: string;
  }): Promise<{ data: PullRequestComment[] }>;
  updateComment(params: {
    body: string;
    comment_id: number;
    owner: string;
    repo: string;
  }): Promise<{ data: PullRequestComment }>;
}

export interface PullRequestIdentity {
  headRefName: string;
  title: string;
}

export interface WarningCommentOctokit {
  rest: {
    issues: PullRequestCommentOperations;
  };
}

export function isManagedVersionPackagesPullRequest(
  pullRequest: PullRequestIdentity,
): boolean {
  return (
    pullRequest.headRefName === MANAGED_VERSION_PACKAGES_BRANCH ||
    pullRequest.title.trim() === MANAGED_VERSION_PACKAGES_TITLE
  );
}

export function renderVersionPlanWarningComment(params: {
  nxPlanCheckOutput: string;
}): string {
  return [
    VERSION_PLAN_WARNING_MARKER,
    "### ⚠️ Missing Nx Version Plan",
    "",
    "Nx Release reports that this PR has touched projects without version plan coverage.",
    "",
    "Run `pnpm nx release plan` and add the generated version plans.",
    "",
    "<details>",
    "<summary>Nx Plan Check result:</summary>",
    "",
    "```text",
    params.nxPlanCheckOutput.trim(),
    "```",
    "</details>",
    "",
    `This comment is managed automatically by Nx Release. [Version plan guide](${VERSION_PLAN_GUIDE_URL})`,
  ].join("\n");
}

export async function syncVersionPlanWarningComment(params: {
  commentBody: null | string;
  octokit: WarningCommentOctokit;
  owner: string;
  pullRequestNumber: number;
  repo: string;
}): Promise<ManagedCommentResult | null> {
  const managedComments = await listManagedWarningComments({
    octokit: params.octokit,
    owner: params.owner,
    pullRequestNumber: params.pullRequestNumber,
    repo: params.repo,
  });

  if (!params.commentBody) {
    if (managedComments.length === 0) {
      return null;
    }

    for (const comment of managedComments) {
      await params.octokit.rest.issues.deleteComment({
        comment_id: comment.id,
        owner: params.owner,
        repo: params.repo,
      });
    }

    return {
      commentId: managedComments[0].id,
      commentUrl: managedComments[0].html_url,
      operation: "deleted",
    };
  }

  const [primaryComment, ...duplicateComments] = managedComments;

  for (const duplicateComment of duplicateComments) {
    await params.octokit.rest.issues.deleteComment({
      comment_id: duplicateComment.id,
      owner: params.owner,
      repo: params.repo,
    });
  }

  if (!primaryComment) {
    const response = await params.octokit.rest.issues.createComment({
      body: params.commentBody,
      issue_number: params.pullRequestNumber,
      owner: params.owner,
      repo: params.repo,
    });

    return {
      commentId: response.data.id,
      commentUrl: response.data.html_url,
      operation: "created",
    };
  }

  if ((primaryComment.body ?? "") === params.commentBody) {
    return {
      commentId: primaryComment.id,
      commentUrl: primaryComment.html_url,
      operation: "noop",
    };
  }

  const response = await params.octokit.rest.issues.updateComment({
    body: params.commentBody,
    comment_id: primaryComment.id,
    owner: params.owner,
    repo: params.repo,
  });

  return {
    commentId: response.data.id,
    commentUrl: response.data.html_url,
    operation: "updated",
  };
}

async function listManagedWarningComments(params: {
  octokit: WarningCommentOctokit;
  owner: string;
  pullRequestNumber: number;
  repo: string;
}): Promise<PullRequestComment[]> {
  const comments: PullRequestComment[] = [];
  let page = 1;

  while (true) {
    const response = await params.octokit.rest.issues.listComments({
      issue_number: params.pullRequestNumber,
      owner: params.owner,
      page,
      per_page: COMMENT_PAGE_SIZE,
      repo: params.repo,
    });

    const parsedComments = z
      .array(PullRequestCommentSchema)
      .safeParse(response.data);
    if (!parsedComments.success) {
      throw new Error(
        `Failed to validate pull request comments payload: ${parsedComments.error.message}`,
      );
    }

    comments.push(
      ...parsedComments.data.filter((comment) =>
        comment.body?.includes(VERSION_PLAN_WARNING_MARKER),
      ),
    );

    if (parsedComments.data.length < COMMENT_PAGE_SIZE) {
      return comments;
    }

    page += 1;
  }
}
