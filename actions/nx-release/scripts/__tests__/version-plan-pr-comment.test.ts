import { describe, expect, it } from "vitest";

import {
  aggregateVersionPlanFiles,
  isManagedVersionPackagesPullRequest,
  parseVersionPlanFile,
  type PullRequestComment,
  type PullRequestCommentOperations,
  type PullRequestFile,
  renderVersionPlanComment,
  selectRelevantVersionPlanFiles,
  type SummaryCommentOctokit,
  syncVersionPlanSummaryComment,
  VERSION_PLAN_SUMMARY_MARKER,
  type VersionPlanFile,
} from "../version-plan-pr-comment.js";

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
): SummaryCommentOctokit & { issueComments: InMemoryIssueComments } {
  const issueComments = new InMemoryIssueComments(comments);

  return {
    issueComments,
    rest: {
      issues: issueComments,
      pulls: {
        async listFiles(): Promise<{ data: PullRequestFile[] }> {
          return { data: [] };
        },
      },
    },
  };
}

describe("parseVersionPlanFile", () => {
  it("parses a version plan file and extracts the first summary line", () => {
    const versionPlan = parseVersionPlanFile(
      ".nx/version-plans/feature.md",
      [
        "---",
        '"@pagopa/example": minor',
        "---",
        "",
        "Add support for feature X",
        "",
        "More details below.",
      ].join("\n"),
    );

    expect(versionPlan).toEqual({
      filePath: ".nx/version-plans/feature.md",
      releases: [{ bumpType: "minor", packageName: "@pagopa/example" }],
      summary: "Add support for feature X",
    });
  });

  it("throws when the frontmatter is missing", () => {
    expect(() =>
      parseVersionPlanFile(
        ".nx/version-plans/invalid.md",
        "No frontmatter here",
      ),
    ).toThrow("missing a valid YAML frontmatter block");
  });

  it("throws when the frontmatter contains an unsupported bump type", () => {
    expect(() =>
      parseVersionPlanFile(
        ".nx/version-plans/invalid.md",
        ["---", '"@pagopa/example": hotfix', "---"].join("\n"),
      ),
    ).toThrow("invalid frontmatter");
  });
});

describe("aggregateVersionPlanFiles", () => {
  it("keeps the highest bump when the same package appears multiple times", () => {
    const versionPlanFiles: VersionPlanFile[] = [
      {
        filePath: ".nx/version-plans/patch.md",
        releases: [{ bumpType: "patch", packageName: "@pagopa/example" }],
        summary: "Patch release",
      },
      {
        filePath: ".nx/version-plans/minor.md",
        releases: [{ bumpType: "minor", packageName: "@pagopa/example" }],
        summary: "Minor release",
      },
    ];

    expect(aggregateVersionPlanFiles(versionPlanFiles)).toEqual([
      {
        bumpType: "minor",
        packageName: "@pagopa/example",
        sourceFiles: [
          ".nx/version-plans/minor.md",
          ".nx/version-plans/patch.md",
        ],
      },
    ]);
  });
});

describe("selectRelevantVersionPlanFiles", () => {
  it("returns only active version plan files in deterministic order", () => {
    const pullRequestFiles: PullRequestFile[] = [
      { filename: "README.md", status: "modified" },
      { filename: ".nx/version-plans/b.md", status: "removed" },
      { filename: ".nx/version-plans/a.md", status: "added" },
      { filename: ".nx/version-plans/c.md", status: "renamed" },
    ];

    expect(selectRelevantVersionPlanFiles(pullRequestFiles)).toEqual([
      ".nx/version-plans/a.md",
      ".nx/version-plans/c.md",
    ]);
  });
});

describe("renderVersionPlanComment", () => {
  it("renders a managed markdown summary with package table and details", () => {
    const comment = renderVersionPlanComment({
      commitSha: "abcdef1234567890",
      owner: "pagopa",
      repo: "dx",
      versionPlanFiles: [
        {
          filePath: ".nx/version-plans/example.md",
          releases: [{ bumpType: "minor", packageName: "@pagopa/example" }],
          summary: "Add support for feature X",
        },
      ],
    });

    expect(comment).toContain(VERSION_PLAN_SUMMARY_MARKER);
    expect(comment).toContain("### Nx Version Plan Summary");
    expect(comment).toContain("@pagopa/example");
    expect(comment).toContain("Minor");
    expect(comment).toContain("Detected version plan files");
    expect(comment).toContain("abcdef1");
  });

  it("escapes backslashes before other markdown metacharacters", () => {
    const comment = renderVersionPlanComment({
      commitSha: "abcdef1234567890",
      owner: "pagopa",
      repo: "dx",
      versionPlanFiles: [
        {
          filePath: ".nx/version-plans/example.md",
          releases: [{ bumpType: "minor", packageName: "@pagopa/example" }],
          summary: String.raw`Preserve \| pipes`,
        },
      ],
    });

    expect(comment).toContain(String.raw`Preserve \\\| pipes`);
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

describe("syncVersionPlanSummaryComment", () => {
  it("creates a new managed comment when none exists", async () => {
    const octokit = createOctokitWithComments([]);

    const result = await syncVersionPlanSummaryComment({
      commentBody: `${VERSION_PLAN_SUMMARY_MARKER}\nhello`,
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
        body: `${VERSION_PLAN_SUMMARY_MARKER}\nold`,
        html_url: "https://github.com/pagopa/dx/issues/12#issuecomment-1",
        id: 1,
      },
      {
        body: `${VERSION_PLAN_SUMMARY_MARKER}\nduplicate`,
        html_url: "https://github.com/pagopa/dx/issues/12#issuecomment-2",
        id: 2,
      },
    ]);

    const result = await syncVersionPlanSummaryComment({
      commentBody: `${VERSION_PLAN_SUMMARY_MARKER}\nnew`,
      octokit,
      owner: "pagopa",
      pullRequestNumber: 12,
      repo: "dx",
    });

    expect(result?.operation).toBe("updated");
    expect(octokit.issueComments.updatedBodies).toEqual([
      `${VERSION_PLAN_SUMMARY_MARKER}\nnew`,
    ]);
    expect(octokit.issueComments.deletedIds).toEqual([2]);
  });

  it("deletes managed comments when the summary body is null", async () => {
    const octokit = createOctokitWithComments([
      {
        body: `${VERSION_PLAN_SUMMARY_MARKER}\nold`,
        html_url: "https://github.com/pagopa/dx/issues/12#issuecomment-1",
        id: 1,
      },
    ]);

    const result = await syncVersionPlanSummaryComment({
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
