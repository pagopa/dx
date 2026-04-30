import { describe, expect, it } from "vitest";

import {
  isManagedVersionPackagesPullRequest,
  type PullRequestComment,
  type PullRequestCommentOperations,
  renderVersionPlanWarningComment,
  syncVersionPlanWarningComment,
  VERSION_PLAN_WARNING_MARKER,
  type WarningCommentOctokit,
} from "../version-plan-coverage-pr-comment.js";

class InMemoryIssueComments implements PullRequestCommentOperations {
  public comments: PullRequestComment[];

  public readonly createdBodies: string[] = [];

  public readonly deletedIds: number[] = [];

  public readonly updatedBodies: string[] = [];

  public constructor(comments: PullRequestComment[]) {
    this.comments = comments;
  }

  public async createComment(params: {
    body: string;
    issue_number: number;
    owner: string;
    repo: string;
  }): Promise<{ data: PullRequestComment }> {
    const nextComment = {
      body: params.body,
      html_url: `https://github.com/${params.owner}/${params.repo}/issues/${params.issue_number}#issuecomment-${this.comments.length + 1}`,
      id: this.comments.length + 1,
    };

    this.comments.push(nextComment);
    this.createdBodies.push(params.body);

    return { data: nextComment };
  }

  public async deleteComment(params: {
    comment_id: number;
    owner: string;
    repo: string;
  }): Promise<void> {
    this.comments = this.comments.filter(
      (comment) => comment.id !== params.comment_id,
    );
    this.deletedIds.push(params.comment_id);
  }

  public async listComments(): Promise<{ data: PullRequestComment[] }> {
    return { data: this.comments };
  }

  public async updateComment(params: {
    body: string;
    comment_id: number;
    owner: string;
    repo: string;
  }): Promise<{ data: PullRequestComment }> {
    const updatedComment = this.comments.find(
      (comment) => comment.id === params.comment_id,
    );

    if (!updatedComment) {
      throw new Error(`Comment ${params.comment_id} not found`);
    }

    updatedComment.body = params.body;
    this.updatedBodies.push(params.body);

    return { data: updatedComment };
  }
}

function createOctokitWithComments(
  comments: PullRequestComment[],
): WarningCommentOctokit & { issueComments: InMemoryIssueComments } {
  const issueComments = new InMemoryIssueComments(comments);

  return {
    issueComments,
    rest: {
      issues: issueComments,
    },
  };
}

describe("renderVersionPlanWarningComment", () => {
  it("renders a managed warning comment from nx release plan:check output", () => {
    const comment = renderVersionPlanWarningComment({
      nxPlanCheckOutput: [
        "NX   Touched projects missing version plans",
        "",
        "The following touched projects do not feature in any version plan files:",
        "  - nx-release",
      ].join("\n"),
    });

    expect(comment).toContain(VERSION_PLAN_WARNING_MARKER);
    expect(comment).toContain("### ⚠️ Missing Nx Version Plan");
    expect(comment).toContain(
      "Run `pnpm nx release plan` and add the generated version plans.",
    );
    expect(comment).toContain("Touched projects missing version plans");
    expect(comment).toContain("<summary>Nx Plan Check result:</summary>");
    expect(comment).toContain("```text");
    expect(comment).toContain(
      "This comment is managed automatically by Nx Release. [Version plan guide]",
    );
  });
});

describe("isManagedVersionPackagesPullRequest", () => {
  it("matches the auto-generated Version Packages PR by branch or title", () => {
    expect(
      isManagedVersionPackagesPullRequest({
        headRefName: "nx-release/main",
        title: "Feature branch",
      }),
    ).toBe(true);

    expect(
      isManagedVersionPackagesPullRequest({
        headRefName: "feature/my-change",
        title: "Version Packages",
      }),
    ).toBe(true);
  });
});

describe("syncVersionPlanWarningComment", () => {
  it("creates a new managed comment when none exists", async () => {
    const octokit = createOctokitWithComments([]);

    const result = await syncVersionPlanWarningComment({
      commentBody: `${VERSION_PLAN_WARNING_MARKER}\nhello`,
      octokit,
      owner: "pagopa",
      pullRequestNumber: 12,
      repo: "dx",
    });

    expect(result?.operation).toBe("created");
    expect(octokit.issueComments.createdBodies).toHaveLength(1);
  });

  it("updates the existing managed comment without duplicating it", async () => {
    const octokit = createOctokitWithComments([
      {
        body: `${VERSION_PLAN_WARNING_MARKER}\nold`,
        html_url: "https://github.com/pagopa/dx/issues/12#issuecomment-1",
        id: 1,
      },
      {
        body: `${VERSION_PLAN_WARNING_MARKER}\nduplicate`,
        html_url: "https://github.com/pagopa/dx/issues/12#issuecomment-2",
        id: 2,
      },
    ]);

    const result = await syncVersionPlanWarningComment({
      commentBody: `${VERSION_PLAN_WARNING_MARKER}\nnew`,
      octokit,
      owner: "pagopa",
      pullRequestNumber: 12,
      repo: "dx",
    });

    expect(result?.operation).toBe("updated");
    expect(octokit.issueComments.updatedBodies).toEqual([
      `${VERSION_PLAN_WARNING_MARKER}\nnew`,
    ]);
    expect(octokit.issueComments.deletedIds).toEqual([2]);
  });

  it("deletes managed comments when the warning body is null", async () => {
    const octokit = createOctokitWithComments([
      {
        body: `${VERSION_PLAN_WARNING_MARKER}\nold`,
        html_url: "https://github.com/pagopa/dx/issues/12#issuecomment-1",
        id: 1,
      },
    ]);

    const result = await syncVersionPlanWarningComment({
      commentBody: null,
      octokit,
      owner: "pagopa",
      pullRequestNumber: 12,
      repo: "dx",
    });

    expect(result?.operation).toBe("deleted");
    expect(octokit.issueComments.deletedIds).toEqual([1]);
  });
});
