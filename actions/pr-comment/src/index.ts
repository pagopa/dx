/**
 * @fileoverview PR Comment Manager Action
 *
 * This module provides functionality to create and manage comments on GitHub Pull Requests.
 * It can create new comments or update existing ones based on a search pattern.
 */

import { getInput, info, setFailed, setOutput, warning } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { readFileSync } from "fs";
import { relative, resolve } from "path";

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
  const commentBody = getInput("comment-body");
  const commentBodyFile = getInput("comment-body-file");
  const searchPattern = getInput("search-pattern");

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
 * Validates that a file path is safe to read
 * @param filePath - The file path to validate
 * @throws Error if the path is unsafe
 */
function validateFilePath(filePath: string): void {
  // Resolve the absolute path
  const absolutePath = resolve(filePath);

  // Get the current working directory
  const cwd = process.cwd();

  // Check if the resolved path is within the current working directory
  const relativePath = relative(cwd, absolutePath);

  // Prevent directory traversal attacks
  if (
    relativePath.startsWith("..") ||
    resolve(cwd, relativePath) !== absolutePath
  ) {
    throw new Error(
      `File path "${filePath}" is outside the allowed directory. Only files within the current working directory are allowed.`,
    );
  }

  // Additional security: block common sensitive file patterns
  const sensitivePatterns = [
    "/etc/",
    "/proc/",
    "/sys/",
    "/.ssh/",
    "/.env",
    "/tmp/",
    "id_rsa",
    "id_dsa",
    "authorized_keys",
    "known_hosts",
  ];

  const normalizedPath = absolutePath.toLowerCase();
  for (const pattern of sensitivePatterns) {
    if (normalizedPath.includes(pattern)) {
      throw new Error(
        `File path "${filePath}" contains potentially sensitive pattern "${pattern}".`,
      );
    }
  }
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
      // Validate the file path for security
      validateFilePath(inputs.commentBodyFile);

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
  octokit: ReturnType<typeof getOctokit>,
  context: GitHubContext,
  searchPattern: string,
): Promise<void> {
  try {
    info(`Searching for existing comments with pattern: "${searchPattern}"`);

    // Use paginate to fetch all comments
    const comments = await octokit.paginate(octokit.rest.issues.listComments, {
      issue_number: context.issueNumber,
      owner: context.owner,
      per_page: 100, // Increase per_page for efficiency
      repo: context.repo,
    });

    // Normalize pattern for robust comparison (case-insensitive)
    const normalizedPattern = searchPattern.trim().toLowerCase();

    const matchingComments = comments.filter((comment) =>
      comment.body?.toLowerCase().includes(normalizedPattern),
    );

    info(`Found ${matchingComments.length} matching comments to delete`);

    for (const comment of matchingComments) {
      await octokit.rest.issues.deleteComment({
        comment_id: comment.id,
        owner: context.owner,
        repo: context.repo,
      });
      info(`Deleted comment with ID: ${comment.id}`);
    }
  } catch (error) {
    warning(
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
  octokit: ReturnType<typeof getOctokit>,
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

    info(`Successfully created comment with ID: ${comment.id}`);
    setOutput("comment-id", comment.id.toString());
    setOutput("comment-url", comment.html_url);
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
    info("Starting PR Comment Manager Action");

    // Get and validate inputs
    const inputs = getInputs();
    info("Successfully validated inputs");

    // Get GitHub context
    const context = getGitHubContext();
    info(
      `Running on PR #${context.issueNumber} in ${context.owner}/${context.repo}`,
    );

    // Get GitHub token and create client
    const token = getInput("github-token") || process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error(
        "GitHub token not found. Please provide github-token input or GITHUB_TOKEN environment variable",
      );
    }

    const octokit = getOctokit(token);

    // Resolve comment body content
    const commentBody = resolveCommentBody(inputs);
    info("Successfully resolved comment body content");

    // Delete existing comments if search pattern is provided
    if (inputs.searchPattern) {
      await deleteMatchingComments(octokit, context, inputs.searchPattern);
    }

    // Create new comment
    await createComment(octokit, context, commentBody);

    info("PR Comment Manager Action completed successfully");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    setFailed(`Action failed: ${errorMessage}`);
  }
}

// Run the action
if (require.main === module) {
  run();
}

export { run };
