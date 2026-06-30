/** This module creates GitHub PR comments as a reusable dx-tasks task. */

import { Octokit } from "octokit";
import * as z from "zod/mini";

import type { TaskRunContext } from "../dispatcher.ts";

const nonEmptyStringSchema = z.string().check(z.minLength(1));

const prCommentPayloadShape = {
  commentBody: nonEmptyStringSchema,
  footer: z.optional(nonEmptyStringSchema),
  githubToken: z.optional(nonEmptyStringSchema),
  issueNumber: z.number().check(z.int(), z.positive()),
  owner: nonEmptyStringSchema,
  repo: nonEmptyStringSchema,
  searchPattern: z.optional(nonEmptyStringSchema),
  title: z.optional(nonEmptyStringSchema),
};

export const payloadSchema = z.object(prCommentPayloadShape);

export interface PrCommentPayload {
  commentBody: string;
  footer?: string;
  githubToken?: string;
  issueNumber: number;
  owner: string;
  repo: string;
  searchPattern?: string;
  title?: string;
}

export interface PrCommentResult {
  commentId: number;
  commentUrl: string;
}

const githubCommentShape = {
  body: z.optional(z.nullable(z.string())),
  id: z.number().check(z.int(), z.positive()),
};

const githubCreatedCommentSchema = z.object({
  ...githubCommentShape,
  html_url: z.string().check(z.minLength(1)),
});
const githubCommentsSchema = z.array(z.object(githubCommentShape));

export interface GitHubComment {
  body?: null | string;
  id: number;
}

export interface GitHubCommentTarget {
  issueNumber: number;
  owner: string;
  repo: string;
}

export interface GitHubPrCommentClient {
  createComment: (
    target: GitHubCommentTarget,
    body: string,
  ) => Promise<PrCommentResult>;
  deleteComment: (
    owner: string,
    repo: string,
    commentId: number,
  ) => Promise<void>;
  listComments: (
    target: GitHubCommentTarget,
  ) => Promise<readonly GitHubComment[]>;
}

export type GitHubPrCommentClientFactory = (
  token: string,
) => GitHubPrCommentClient;

class OctokitPrCommentClient implements GitHubPrCommentClient {
  private readonly octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async createComment(
    { issueNumber, owner, repo }: GitHubCommentTarget,
    body: string,
  ): Promise<PrCommentResult> {
    const { data } = await this.octokit.rest.issues.createComment({
      body,
      issue_number: issueNumber,
      owner,
      repo,
    });
    const comment = githubCreatedCommentSchema.parse(data);

    return {
      commentId: comment.id,
      commentUrl: comment.html_url,
    };
  }

  async deleteComment(
    owner: string,
    repo: string,
    commentId: number,
  ): Promise<void> {
    await this.octokit.rest.issues.deleteComment({
      comment_id: commentId,
      owner,
      repo,
    });
  }

  async listComments({
    issueNumber,
    owner,
    repo,
  }: GitHubCommentTarget): Promise<readonly GitHubComment[]> {
    const comments = await this.octokit.paginate(
      this.octokit.rest.issues.listComments,
      {
        issue_number: issueNumber,
        owner,
        per_page: 100,
        repo,
      },
    );

    return githubCommentsSchema.parse(comments);
  }
}

const createOctokitPrCommentClient: GitHubPrCommentClientFactory = (token) =>
  new OctokitPrCommentClient(token);

const deleteMatchingComments = async (
  client: GitHubPrCommentClient,
  target: GitHubCommentTarget,
  searchPattern: string,
): Promise<void> => {
  const normalizedPattern = searchPattern.trim().toLowerCase();
  const comments = await client.listComments(target);
  const matchingComments = comments.filter((comment) =>
    (comment.body ?? "").toLowerCase().includes(normalizedPattern),
  );

  for (const comment of matchingComments) {
    await client.deleteComment(target.owner, target.repo, comment.id);
  }
};

const getGitHubToken = (githubToken?: string): string => {
  const token = githubToken ?? process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error(
      "GitHub token not found. Please provide githubToken or GITHUB_TOKEN environment variable",
    );
  }

  return token;
};

const formatCommentBody = ({
  commentBody,
  footer,
  title,
}: Pick<PrCommentPayload, "commentBody" | "footer" | "title">): string => {
  const titledBody =
    title === undefined ? commentBody : `## ${title}\n\n${commentBody}`;

  return footer === undefined
    ? titledBody
    : `${titledBody}\n\n---\n\n${footer}`;
};

export async function prComment(
  {
    commentBody,
    footer,
    githubToken,
    issueNumber,
    owner,
    repo,
    searchPattern,
    title,
  }: PrCommentPayload,
  context: TaskRunContext = {},
  createClient: GitHubPrCommentClientFactory = createOctokitPrCommentClient,
): Promise<PrCommentResult> {
  void context;

  const target = { issueNumber, owner, repo };
  const client = createClient(getGitHubToken(githubToken));

  if (searchPattern) {
    try {
      await deleteMatchingComments(client, target, searchPattern);
    } catch (error) {
      console.warn(
        `Failed to delete existing comments: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return client.createComment(
    target,
    formatCommentBody({ commentBody, footer, title }),
  );
}
