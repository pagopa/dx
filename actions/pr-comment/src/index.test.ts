import * as core from "@actions/core";
import * as github from "@actions/github";
import { readFileSync } from "fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";

import { run } from "../src/index.js";

// Mock the dependencies
vi.mock("@actions/core", () => ({
  getInput: vi.fn(),
  info: vi.fn(),
  setFailed: vi.fn(),
  setOutput: vi.fn(),
  warning: vi.fn(),
}));

vi.mock("@actions/github", () => ({
  context: {},
  getOctokit: vi.fn(),
}));

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
}));

// Create deep mocks with proper typing
const mockCore = vi.mocked(core);
const mockGithub = vi.mocked(github);
const mockReadFileSync = vi.mocked(readFileSync);

// Define proper interfaces for GitHub API
interface GitHubComment {
  body?: string;
  html_url: string;
  id: number;
}

interface OctokitInstance {
  paginate: (fn: unknown, params: unknown) => Promise<GitHubComment[]>;
  rest: {
    issues: {
      createComment: (
        params: unknown,
      ) => Promise<OctokitResponse<GitHubComment>>;
      deleteComment: (params: unknown) => Promise<void>;
      listComments: (
        params: unknown,
      ) => Promise<OctokitResponse<GitHubComment[]>>;
    };
  };
}

interface OctokitResponse<T> {
  data: T;
}

// Create properly typed octokit mock using vitest-mock-extended
const mockOctokit = mockDeep<OctokitInstance>();

/* eslint-disable max-lines-per-function */
describe("PR Comment Manager Action", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Set up default mocks
    mockGithub.getOctokit.mockReturnValue(
      mockOctokit as unknown as ReturnType<typeof github.getOctokit>,
    );

    // Mock the context object by overriding the property
    Object.defineProperty(mockGithub, "context", {
      configurable: true,
      value: {
        issue: { number: 123 },
        repo: { owner: "test-owner", repo: "test-repo" },
      },
      writable: true,
    });

    // Mock process.cwd()
    vi.spyOn(process, "cwd").mockReturnValue("/test/workspace");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Input validation", () => {
    it("should fail when neither comment-body nor comment-body-file is provided", async () => {
      // Arrange
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          "comment-body": "",
          "comment-body-file": "",
          "github-token": "test-token",
          "search-pattern": "",
        };
        return inputs[name] || "";
      });

      // Act
      await run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        "Action failed: Either comment-body or comment-body-file must be provided",
      );
    });

    it("should succeed with comment-body input", async () => {
      // Arrange
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          "comment-body": "Test comment body",
          "comment-body-file": "",
          "github-token": "test-token",
          "search-pattern": "",
        };
        return inputs[name] || "";
      });

      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { html_url: "https://github.com/test/comment/456", id: 456 },
      });

      // Act
      await run();

      // Assert
      expect(mockCore.setFailed).not.toHaveBeenCalled();
      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        body: "Test comment body",
        issue_number: 123,
        owner: "test-owner",
        repo: "test-repo",
      });
    });

    it("should succeed with comment-body-file input", async () => {
      // Arrange
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          "comment-body": "",
          "comment-body-file": "comment.md",
          "github-token": "test-token",
          "search-pattern": "",
        };
        return inputs[name] || "";
      });

      mockReadFileSync.mockReturnValue("File comment content");
      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { html_url: "https://github.com/test/comment/456", id: 456 },
      });

      // Act
      await run();

      // Assert
      expect(mockCore.setFailed).not.toHaveBeenCalled();
      expect(mockReadFileSync).toHaveBeenCalledWith("comment.md", "utf8");
      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        body: "File comment content",
        issue_number: 123,
        owner: "test-owner",
        repo: "test-repo",
      });
    });
  });

  describe("GitHub context validation", () => {
    it("should fail when not running in a pull request context", async () => {
      // Arrange
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          "comment-body": "Test comment",
          "github-token": "test-token",
        };
        return inputs[name] || "";
      });

      // Mock context without issue number using Object.defineProperty
      Object.defineProperty(mockGithub, "context", {
        configurable: true,
        value: {
          issue: { number: null },
          repo: { owner: "test-owner", repo: "test-repo" },
        },
        writable: true,
      });

      // Act
      await run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        "Action failed: This action can only be run on pull requests",
      );
    });

    it("should fail when GitHub token is not provided", async () => {
      // Arrange
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          "comment-body": "Test comment",
          "github-token": "",
        };
        return inputs[name] || "";
      });

      // Mock empty environment
      delete process.env.GITHUB_TOKEN;

      // Act
      await run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        "Action failed: GitHub token not found. Please provide github-token input or GITHUB_TOKEN environment variable",
      );
    });
  });

  describe("File path validation", () => {
    it("should reject paths outside working directory", async () => {
      // Arrange
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          "comment-body": "",
          "comment-body-file": "../../../etc/passwd",
          "github-token": "test-token",
        };
        return inputs[name] || "";
      });

      // Act
      await run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        expect.stringContaining(
          'File path "../../../etc/passwd" is outside the allowed directory',
        ),
      );
    });

    it("should reject sensitive file patterns", async () => {
      // Arrange
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          "comment-body": "",
          "comment-body-file": ".env",
          "github-token": "test-token",
        };
        return inputs[name] || "";
      });

      // Act
      await run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        expect.stringContaining("contains potentially sensitive pattern"),
      );
    });

    it("should handle file read errors gracefully", async () => {
      // Arrange
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          "comment-body": "",
          "comment-body-file": "nonexistent.md",
          "github-token": "test-token",
        };
        return inputs[name] || "";
      });

      mockReadFileSync.mockImplementation(() => {
        throw new Error("ENOENT: no such file or directory");
      });

      // Act
      await run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        expect.stringContaining(
          "Failed to read comment body file: nonexistent.md",
        ),
      );
    });
  });

  describe("Comment management", () => {
    beforeEach(() => {
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          "comment-body": "New test comment",
          "github-token": "test-token",
          "search-pattern": "<!-- test-marker -->",
        };
        return inputs[name] || "";
      });
    });

    it("should delete existing comments with matching search pattern", async () => {
      // Arrange
      const mockComments: GitHubComment[] = [
        {
          body: "<!-- test-marker --> Old comment 1",
          html_url: "https://github.com/test/comment/1",
          id: 1,
        },
        {
          body: "Some other comment",
          html_url: "https://github.com/test/comment/2",
          id: 2,
        },
        {
          body: "Another <!-- test-marker --> comment",
          html_url: "https://github.com/test/comment/3",
          id: 3,
        },
      ];

      mockOctokit.paginate.mockResolvedValue(mockComments);
      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { html_url: "https://github.com/test/comment/456", id: 456 },
      });

      // Act
      await run();

      // Assert
      expect(mockOctokit.rest.issues.deleteComment).toHaveBeenCalledTimes(2);
      expect(mockOctokit.rest.issues.deleteComment).toHaveBeenCalledWith({
        comment_id: 1,
        owner: "test-owner",
        repo: "test-repo",
      });
      expect(mockOctokit.rest.issues.deleteComment).toHaveBeenCalledWith({
        comment_id: 3,
        owner: "test-owner",
        repo: "test-repo",
      });
    });

    it("should create a new comment after deletion", async () => {
      // Arrange
      mockOctokit.paginate.mockResolvedValue([]);
      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { html_url: "https://github.com/test/comment/456", id: 456 },
      });

      // Act
      await run();

      // Assert
      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        body: "New test comment",
        issue_number: 123,
        owner: "test-owner",
        repo: "test-repo",
      });
      expect(mockCore.setOutput).toHaveBeenCalledWith("comment-id", "456");
      expect(mockCore.setOutput).toHaveBeenCalledWith(
        "comment-url",
        "https://github.com/test/comment/456",
      );
    });

    it("should handle comment creation errors", async () => {
      // Arrange
      mockOctokit.paginate.mockResolvedValue([]);
      mockOctokit.rest.issues.createComment.mockRejectedValue(
        new Error("API rate limit exceeded"),
      );

      // Act
      await run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        "Action failed: Failed to create comment: API rate limit exceeded",
      );
    });

    it("should handle comment deletion errors gracefully", async () => {
      // Arrange
      const mockComments: GitHubComment[] = [
        {
          body: "<!-- test-marker --> Old comment",
          html_url: "https://github.com/test/comment/1",
          id: 1,
        },
      ];

      mockOctokit.paginate.mockResolvedValue(mockComments);
      mockOctokit.rest.issues.deleteComment.mockRejectedValue(
        new Error("Comment not found"),
      );
      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { html_url: "https://github.com/test/comment/456", id: 456 },
      });

      // Act
      await run();

      // Assert
      expect(mockCore.warning).toHaveBeenCalledWith(
        "Failed to delete existing comments: Comment not found",
      );
      // Should still create the new comment
      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalled();
    });

    it("should handle case-insensitive search pattern matching", async () => {
      // Arrange
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          "comment-body": "New test comment",
          "github-token": "test-token",
          "search-pattern": "TEST-MARKER",
        };
        return inputs[name] || "";
      });

      const mockComments: GitHubComment[] = [
        {
          body: "<!-- test-marker --> Old comment",
          html_url: "https://github.com/test/comment/1",
          id: 1,
        },
        {
          body: "<!-- TEST-MARKER --> Another comment",
          html_url: "https://github.com/test/comment/2",
          id: 2,
        },
        {
          body: "No marker here",
          html_url: "https://github.com/test/comment/3",
          id: 3,
        },
      ];

      mockOctokit.paginate.mockResolvedValue(mockComments);
      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { html_url: "https://github.com/test/comment/456", id: 456 },
      });

      // Act
      await run();

      // Assert
      expect(mockOctokit.rest.issues.deleteComment).toHaveBeenCalledTimes(2);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete workflow without search pattern", async () => {
      // Arrange
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          "comment-body": "Simple comment without deletion",
          "github-token": "test-token",
        };
        return inputs[name] || "";
      });

      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { html_url: "https://github.com/test/comment/789", id: 789 },
      });

      // Act
      await run();

      // Assert
      expect(mockOctokit.paginate).not.toHaveBeenCalled();
      expect(mockOctokit.rest.issues.deleteComment).not.toHaveBeenCalled();
      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        body: "Simple comment without deletion",
        issue_number: 123,
        owner: "test-owner",
        repo: "test-repo",
      });
    });

    it("should use GITHUB_TOKEN environment variable when input is not provided", async () => {
      // Arrange
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          "comment-body": "Test comment",
          "github-token": "",
        };
        return inputs[name] || "";
      });

      process.env.GITHUB_TOKEN = "env-token";

      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { html_url: "https://github.com/test/comment/456", id: 456 },
      });

      // Act
      await run();

      // Assert
      expect(mockGithub.getOctokit).toHaveBeenCalledWith("env-token");
      expect(mockCore.setFailed).not.toHaveBeenCalled();

      // Cleanup
      delete process.env.GITHUB_TOKEN;
    });
  });

  describe("Error handling edge cases", () => {
    it("should handle non-Error exceptions", async () => {
      // Arrange
      mockCore.getInput.mockImplementation(() => {
        throw "String error";
      });

      // Act
      await run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        "Action failed: String error",
      );
    });

    it("should handle undefined comment body in existing comments", async () => {
      // Arrange
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          "comment-body": "New comment",
          "github-token": "test-token",
          "search-pattern": "marker",
        };
        return inputs[name] || "";
      });

      const mockComments: GitHubComment[] = [
        {
          body: undefined,
          html_url: "https://github.com/test/comment/1",
          id: 1,
        }, // Comment with undefined body
        {
          body: "Comment with marker",
          html_url: "https://github.com/test/comment/2",
          id: 2,
        },
      ];

      mockOctokit.paginate.mockResolvedValue(mockComments);
      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { html_url: "https://github.com/test/comment/456", id: 456 },
      });

      // Act
      await run();

      // Assert
      expect(mockOctokit.rest.issues.deleteComment).toHaveBeenCalledTimes(1);
      expect(mockOctokit.rest.issues.deleteComment).toHaveBeenCalledWith({
        comment_id: 2,
        owner: "test-owner",
        repo: "test-repo",
      });
    });
  });
});
