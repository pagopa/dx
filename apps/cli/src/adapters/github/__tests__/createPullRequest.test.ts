import { err, ok } from "neverthrow";
import { Octokit } from "octokit";
import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";

import { createPullRequest } from "../createPullRequest.js";

const makeMockDependencies = () => ({
  client: mock<Octokit>(),
});

describe("createPullRequest", () => {
  it("should create a Pull Request with required parameters", async () => {
    const mockResponse = {
      data: {
        id: 456789,
        number: 123,
        url: "https://github.com/owner/repo/pull/123",
      },
      headers: {},
      status: 201,
      url: "",
    };

    const mockDependencies = makeMockDependencies();
    const mockOctokit = mockDependencies.client;
    mockOctokit.request.mockResolvedValue(mockResponse);

    const result = await createPullRequest(mockDependencies)({
      head: "features/scaffold-repo",
      repo: {
        name: "dx",
        owner: "pagopa",
      },
    });

    expect(mockOctokit.request).toHaveBeenCalledWith(
      "POST /repos/{owner}/{repo}/pulls",
      {
        base: "main",
        head: "features/scaffold-repo",
        owner: "pagopa",
        repo: "dx",
        title: "Scaffold repository",
      },
    );

    expect(result).toStrictEqual(
      ok({
        id: 456789,
        number: 123,
        url: "https://github.com/owner/repo/pull/123",
      }),
    );
  });

  it("should not create a Pull Request due to an error", async () => {
    const mockDependencies = makeMockDependencies();
    const mockOctokit = mockDependencies.client;
    mockOctokit.request.mockRejectedValue(
      new Error("Oh no! Something went wrong."),
    );

    const result = await createPullRequest(mockDependencies)({
      head: "features/scaffold-repo",
      repo: {
        name: "dx",
        owner: "pagopa",
      },
    });

    expect(mockOctokit.request).toHaveBeenCalledWith(
      "POST /repos/{owner}/{repo}/pulls",
      {
        base: "main",
        head: "features/scaffold-repo",
        owner: "pagopa",
        repo: "dx",
        title: "Scaffold repository",
      },
    );

    expect(result).toStrictEqual(
      err(new Error("Failed to create pull request.")),
    );
  });

  // it("should create a pull request with optional body", async () => {
  //   const mockResponse = {
  //     data: {
  //       html_url: "https://github.com/owner/repo/pull/124",
  //       id: 456790,
  //       number: 124,
  //     },
  //   };
  //
  //   mockOctokit.request.mockResolvedValue(mockResponse);
  //
  //   await createPullRequest(mockOctokit, {
  //     body: "This PR fixes issue #123",
  //     head: "fix/bug-123",
  //     owner: "pagopa",
  //     repo: "dx",
  //     title: "fix: bug fix",
  //   });
  //
  //   expect(mockOctokit.request).toHaveBeenCalledWith(
  //     "POST /repos/{owner}/{repo}/pulls",
  //     expect.objectContaining({
  //       body: "This PR fixes issue #123",
  //     }),
  //   );
  // });
  //
  // it("should create a draft pull request when draft is true", async () => {
  //   const mockResponse = {
  //     data: {
  //       html_url: "https://github.com/owner/repo/pull/125",
  //       id: 456791,
  //       number: 125,
  //     },
  //   };
  //
  //   mockOctokit.request.mockResolvedValue(mockResponse);
  //
  //   await createPullRequest(mockOctokit, {
  //     draft: true,
  //     head: "wip/feature",
  //     owner: "pagopa",
  //     repo: "dx",
  //     title: "wip: work in progress",
  //   });
  //
  //   expect(mockOctokit.request).toHaveBeenCalledWith(
  //     "POST /repos/{owner}/{repo}/pulls",
  //     expect.objectContaining({
  //       draft: true,
  //     }),
  //   );
  // });
  //
  // it("should throw error when API call fails", async () => {
  //   const error = new Error("API Error: Validation Failed");
  //   mockOctokit.request.mockRejectedValue(error);
  //
  //   await expect(
  //     createPullRequest(mockOctokit, {
  //       head: "test-branch",
  //       owner: "pagopa",
  //       repo: "dx",
  //       title: "test",
  //     }),
  //   ).rejects.toThrow("API Error: Validation Failed");
  // });
  //
  // it("should always target main as base branch", async () => {
  //   const mockResponse = {
  //     data: {
  //       html_url: "https://github.com/owner/repo/pull/126",
  //       id: 456792,
  //       number: 126,
  //     },
  //   };
  //
  //   mockOctokit.request.mockResolvedValue(mockResponse);
  //
  //   await createPullRequest(mockOctokit, {
  //     head: "test-branch",
  //     owner: "pagopa",
  //     repo: "dx",
  //     title: "test: ensure main is base",
  //   });
  //
  //   expect(mockOctokit.request).toHaveBeenCalledWith(
  //     "POST /repos/{owner}/{repo}/pulls",
  //     expect.objectContaining({
  //       base: "main",
  //     }),
  //   );
  // });
});
