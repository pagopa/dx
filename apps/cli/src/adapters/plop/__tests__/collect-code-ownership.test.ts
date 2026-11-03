/**
 * Ownership collection and the fail-before-scaffold init contract.
 */
import inquirer from "inquirer";
import nodePlop from "node-plop";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";

import {
  type GitHubService,
  RepositoryNotFoundError,
} from "../../../domain/github.js";
import { collectCodeOwnership } from "../collect-code-ownership.js";
import { collectMonorepoPayload } from "../index.js";

vi.mock("inquirer");

const organization = { login: "pagopa", type: "Organization" } as const;

afterEach(() => vi.resetAllMocks());

describe("collectCodeOwnership", () => {
  it("collects multiple owners interactively", async () => {
    const github = mock<GitHubService>();
    github.getAccount.mockResolvedValue({ login: "alice", type: "User" });
    github.getTeam.mockResolvedValue({
      privacy: "closed",
      slug: "product-team",
    });
    vi.mocked(inquirer.prompt).mockResolvedValue({
      codeOwners: "@alice @pagopa/product-team",
    });
    await expect(
      collectCodeOwnership(organization, undefined, github, false),
    ).resolves.toMatchObject({
      owners: ["@alice", "@pagopa/product-team"],
      reviewerTeams: ["product-team"],
    });
  });

  it("rejects a blank organization prompt answer even if prompt validation is bypassed", async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ codeOwners: " " });
    await expect(
      collectCodeOwnership(
        organization,
        undefined,
        mock<GitHubService>(),
        false,
      ),
    ).rejects.toThrow("require at least one");
  });

  it("allows an empty interactive answer for the inferred personal owner", async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ codeOwners: "" });
    await expect(
      collectCodeOwnership(
        { login: "alice", type: "User" },
        undefined,
        mock<GitHubService>(),
        false,
      ),
    ).resolves.toMatchObject({ owners: ["@alice"] });
  });

  it("rejects missing organization owners without prompting in noninteractive mode", async () => {
    await expect(
      collectCodeOwnership(
        organization,
        undefined,
        mock<GitHubService>(),
        true,
      ),
    ).rejects.toThrow("--code-owner");
    expect(inquirer.prompt).not.toHaveBeenCalled();
  });
});

describe("collectMonorepoPayload", () => {
  it("fails before generation when organization owners are missing", async () => {
    const github = mock<GitHubService>();
    github.getAccount.mockResolvedValue(organization);
    await expect(
      collectMonorepoPayload(
        await nodePlop(),
        github,
        {
          repoName: "new-repository",
          repoOwner: "pagopa",
        },
        { nonInteractive: true },
      ),
    ).rejects.toThrow("--code-owner");
    expect(github.getRepository).not.toHaveBeenCalled();
  });

  it("resolves ownership in noninteractive mode without running scaffold actions", async () => {
    const github = mock<GitHubService>();
    github.getAccount.mockResolvedValue(organization);
    github.getTeam.mockResolvedValue({
      privacy: "closed",
      slug: "product-team",
    });
    github.getRepository.mockRejectedValue(
      new RepositoryNotFoundError("pagopa", "new-repository"),
    );
    const { payload } = await collectMonorepoPayload(
      await nodePlop(),
      github,
      {
        codeOwners: ["@pagopa/product-team"],
        repoName: "new-repository",
        repoOwner: "pagopa",
      },
      { nonInteractive: true },
    );

    expect(payload.ownership).toEqual({
      namespaceType: "Organization",
      owners: ["@pagopa/product-team"],
      reviewerTeams: ["product-team"],
    });
    expect(inquirer.prompt).not.toHaveBeenCalled();
  });

  it("infers a personal owner in noninteractive mode", async () => {
    const github = mock<GitHubService>();
    github.getAccount.mockResolvedValue({ login: "alice", type: "User" });
    github.getRepository.mockRejectedValue(
      new RepositoryNotFoundError("alice", "new-repository"),
    );
    const { payload } = await collectMonorepoPayload(
      await nodePlop(),
      github,
      {
        repoName: "new-repository",
        repoOwner: "alice",
      },
      { nonInteractive: true },
    );
    expect(payload.ownership.owners).toEqual(["@alice"]);
    expect(inquirer.prompt).not.toHaveBeenCalled();
  });

  it("propagates namespace validation failures before repository creation", async () => {
    const github = mock<GitHubService>();
    github.getAccount.mockRejectedValue(
      new Error("Cannot validate GitHub account: HTTP 403"),
    );
    await expect(
      collectMonorepoPayload(
        await nodePlop(),
        github,
        {
          repoName: "new-repository",
        },
        { nonInteractive: true },
      ),
    ).rejects.toThrow("HTTP 403");
    expect(github.getRepository).not.toHaveBeenCalled();
  });
});
