/**
 * @fileoverview PR Comment Manager Action
 *
 * This module provides functionality to create and manage comments on GitHub Pull Requests.
 * It can create new comments or update existing ones based on a search pattern.
 */

import * as core from "@actions/core";
import * as github from "@actions/github";
import { readFileSync } from "fs";

/**
 * Input parameters for the PR comment action
 */
interface ActionInputs {
  /** The comment content to post (supports markdown) */
  commentBody?: string;
  /** Path to a file containing the comment content */
  commentBodyFile?: string;
  /** Text pattern to identify existing comments to delete */
  searchPattern?: string;
}

/**
 * GitHub context information needed for API calls
 */
interface GitHubContext {
  issueNumber: number;
  owner: string;
  repo: string;
}

/**
 * Gets and validates the action inputs
 * @returns Validated action inputs
 * @throws Error if validation fails
 */
function getInputs(): ActionInputs {
  const commentBody = core.getInput("comment-body");
  const commentBodyFile = core.getInput("comment-body-file");
  const searchPattern = core.getInput("search-pattern");

  // Validate that at least one content source is provided
  if (!commentBody && !commentBodyFile) {
    throw new Error(
      "Either comment-body or comment-body-file must be provided",
    );
  }

  return {
    commentBody: commentBody || undefined,
    commentBodyFile: commentBodyFile || undefined,
    searchPattern: searchPattern || undefined,
  };
}

/**
 * Gets the GitHub context information
 * @returns GitHub context with owner, repo, and issue number
 * @throws Error if not running in a pull request context
 */
function getGitHubContext(): GitHubContext {
  const { context } = github;

  if (!context.issue.number) {
    throw new Error("This action can only be run on pull requests");
  }

  return {
    issueNumber: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
  };
}

/**
 * Resolves the comment body content from either direct input or file
 * @param inputs - The action inputs
 * @returns The comment body content
 */
function resolveCommentBody(inputs: ActionInputs): string {
  if (inputs.commentBody) {
    return inputs.commentBody;
  }

  if (inputs.commentBodyFile) {
    try {
      return readFileSync(inputs.commentBodyFile, "utf8");
    } catch (error) {
      throw new Error(
        `Failed to read comment body file: ${inputs.commentBodyFile}. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  throw new Error("No comment body content available");
}

/**
 * Deletes existing comments that match the search pattern
 * @param octokit - GitHub API client
 * @param context - GitHub context information
 * @param searchPattern - Pattern to search for in existing comments
 */
async function deleteMatchingComments(
  octokit: ReturnType<typeof github.getOctokit>,
  context: GitHubContext,
  searchPattern: string,
): Promise<void> {
  try {
    core.info(
      `Searching for existing comments with pattern: "${searchPattern}"`,
    );

    const { data: comments } = await octokit.rest.issues.listComments({
      issue_number: context.issueNumber,
      owner: context.owner,
      repo: context.repo,
    });

    // Normalize pattern for robust comparison (case-insensitive)
    const normalizedPattern = searchPattern.trim().toLowerCase();

    const matchingComments = comments.filter((comment) =>
      comment.body?.toLowerCase().includes(normalizedPattern),
    );

    core.info(`Found ${matchingComments.length} matching comments to delete`);

    for (const comment of matchingComments) {
      await octokit.rest.issues.deleteComment({
        comment_id: comment.id,
        owner: context.owner,
        repo: context.repo,
      });
      core.info(`Deleted comment with ID: ${comment.id}`);
    }
  } catch (error) {
    core.warning(
      `Failed to delete existing comments: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Creates a new comment on the pull request
 * @param octokit - GitHub API client
 * @param context - GitHub context information
 * @param body - The comment body content
 */
async function createComment(
  octokit: ReturnType<typeof github.getOctokit>,
  context: GitHubContext,
  body: string,
): Promise<void> {
  try {
    const { data: comment } = await octokit.rest.issues.createComment({
      body,
      issue_number: context.issueNumber,
      owner: context.owner,
      repo: context.repo,
    });

    core.info(`Successfully created comment with ID: ${comment.id}`);
    core.setOutput("comment-id", comment.id.toString());
    core.setOutput("comment-url", comment.html_url);
  } catch (error) {
    throw new Error(
      `Failed to create comment: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Main action logic
 */
async function run(): Promise<void> {
  try {
    core.info("Starting PR Comment Manager Action");

    // Get and validate inputs
    const inputs = getInputs();
    core.info("Successfully validated inputs");

    // Get GitHub context
    const context = getGitHubContext();
    core.info(
      `Running on PR #${context.issueNumber} in ${context.owner}/${context.repo}`,
    );

    // Get GitHub token and create client
    const token = core.getInput("github-token") || process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error(
        "GitHub token not found. Please provide github-token input or GITHUB_TOKEN environment variable",
      );
    }

    const octokit = github.getOctokit(token);

    // Resolve comment body content
    const commentBody = resolveCommentBody(inputs);
    core.info("Successfully resolved comment body content");

    // Delete existing comments if search pattern is provided
    if (inputs.searchPattern) {
      await deleteMatchingComments(octokit, context, inputs.searchPattern);
    }

    // Create new comment
    await createComment(octokit, context, commentBody);

    core.info("PR Comment Manager Action completed successfully");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Action failed: ${errorMessage}`);
  }
}

// Run the action
if (require.main === module) {
  run();
}

export { run };
