import { describe, expect, it, vi } from "vitest";

import type {
  GitHubDefaultBranch,
  GitHubEnvironment,
  GitHubRepositoryTarget,
  GitHubTerraformEnvironmentReleaseClientFactory,
} from "../validate-terraform-environment-release.ts";

import {
  payloadSchema,
  validateTerraformEnvironmentRelease,
} from "../validate-terraform-environment-release.ts";

const payload = {
  owner: "pagopa",
  project: "resources-prod",
  projectRoot: "infra/resources/prod",
  repo: "dx",
  sourceRef: "a".repeat(40),
};

const createClient = ({
  comparisonStatus = "ahead",
  defaultBranch = { name: "main", protected: true },
  environments = [
    { name: "infra-prod-ci", protectionRules: [] },
    {
      name: "infra-prod-cd",
      protectionRules: ["required_reviewers"],
    },
  ],
  manifest = JSON.stringify({ version: "1.0.0" }),
}: {
  comparisonStatus?: "ahead" | "behind" | "diverged" | "identical";
  defaultBranch?: GitHubDefaultBranch;
  environments?: readonly GitHubEnvironment[];
  manifest?: string;
} = {}) => {
  const compareCommits = vi.fn<
    (
      target: GitHubRepositoryTarget,
      base: string,
      head: string,
    ) => Promise<"ahead" | "behind" | "diverged" | "identical">
  >(async () => comparisonStatus);
  const getDefaultBranch = vi.fn<
    (target: GitHubRepositoryTarget) => Promise<GitHubDefaultBranch>
  >(async () => defaultBranch);
  const getFileContent = vi.fn<
    (
      target: GitHubRepositoryTarget,
      filePath: string,
      ref: string,
    ) => Promise<string>
  >(async () => manifest);
  const listEnvironments = vi.fn<
    (target: GitHubRepositoryTarget) => Promise<readonly GitHubEnvironment[]>
  >(async () => environments);
  const factory = vi.fn<GitHubTerraformEnvironmentReleaseClientFactory>(() => ({
    compareCommits,
    getDefaultBranch,
    getFileContent,
    listEnvironments,
  }));

  return {
    compareCommits,
    factory,
    getDefaultBranch,
    getFileContent,
    listEnvironments,
  };
};

describe("validateTerraformEnvironmentRelease payload", () => {
  it("rejects non-normalized environment paths", () => {
    expect(() =>
      payloadSchema.parse({
        ...payload,
        projectRoot: "infra/resources/../prod",
      }),
    ).toThrow();
  });

  it("rejects abbreviated commit references", () => {
    expect(() =>
      payloadSchema.parse({
        ...payload,
        sourceRef: "abc123",
      }),
    ).toThrow();
  });
});

describe("validateTerraformEnvironmentRelease", () => {
  it("returns inferred deployment metadata for a trusted release", async () => {
    const client = createClient();

    await expect(
      validateTerraformEnvironmentRelease(
        payload,
        { githubToken: "test-token" },
        client.factory,
      ),
    ).resolves.toStrictEqual({
      applyEnvironment: "infra-prod-cd",
      planEnvironment: "infra-prod-ci",
      project: "resources-prod",
      runnerLabel: "prod",
      sourceRef: "a".repeat(40),
    });
    expect(client.factory).toHaveBeenCalledExactlyOnceWith("test-token");
    expect(client.compareCommits).toHaveBeenCalledExactlyOnceWith(
      { owner: "pagopa", repo: "dx" },
      "a".repeat(40),
      "main",
    );
    expect(client.getFileContent).toHaveBeenCalledExactlyOnceWith(
      { owner: "pagopa", repo: "dx" },
      "infra/resources/prod/environment.json",
      "a".repeat(40),
    );
  });

  it("returns deployment overrides from environment.json", async () => {
    const client = createClient({
      environments: [
        { name: "terraform-plan", protectionRules: [] },
        {
          name: "terraform-apply",
          protectionRules: ["required_reviewers"],
        },
      ],
      manifest: JSON.stringify({
        deployment: {
          applyEnvironment: "terraform-apply",
          planEnvironment: "terraform-plan",
          runnerLabel: "terraform-prod",
        },
        version: "1.0.0",
      }),
    });

    await expect(
      validateTerraformEnvironmentRelease(
        payload,
        { githubToken: "test-token" },
        client.factory,
      ),
    ).resolves.toMatchObject({
      applyEnvironment: "terraform-apply",
      planEnvironment: "terraform-plan",
      runnerLabel: "terraform-prod",
    });
  });

  it("rejects projects that do not match their root", async () => {
    const client = createClient();

    await expect(
      validateTerraformEnvironmentRelease(
        { ...payload, project: "resources-dev" },
        { githubToken: "test-token" },
        client.factory,
      ),
    ).rejects.toThrow(
      'Project "resources-dev" does not match root "infra/resources/prod"',
    );
    expect(client.factory).not.toHaveBeenCalled();
  });

  it("rejects commits outside the protected default branch", async () => {
    const client = createClient({ comparisonStatus: "diverged" });

    await expect(
      validateTerraformEnvironmentRelease(
        payload,
        { githubToken: "test-token" },
        client.factory,
      ),
    ).rejects.toThrow(
      `Commit "${"a".repeat(40)}" is not reachable from "main"`,
    );
  });

  it("rejects unprotected default branches", async () => {
    const client = createClient({
      defaultBranch: { name: "main", protected: false },
    });

    await expect(
      validateTerraformEnvironmentRelease(
        payload,
        { githubToken: "test-token" },
        client.factory,
      ),
    ).rejects.toThrow('Default branch "main" is not protected');
    expect(client.compareCommits).not.toHaveBeenCalled();
  });

  it("requires reviewers on the apply environment", async () => {
    const client = createClient({
      environments: [
        { name: "infra-prod-ci", protectionRules: [] },
        { name: "infra-prod-cd", protectionRules: [] },
      ],
    });

    await expect(
      validateTerraformEnvironmentRelease(
        payload,
        { githubToken: "test-token" },
        client.factory,
      ),
    ).rejects.toThrow(
      'Apply environment "infra-prod-cd" has no required reviewers',
    );
  });

  it("requires the plan environment to exist", async () => {
    const client = createClient({
      environments: [
        {
          name: "infra-prod-cd",
          protectionRules: ["required_reviewers"],
        },
      ],
    });

    await expect(
      validateTerraformEnvironmentRelease(
        payload,
        { githubToken: "test-token" },
        client.factory,
      ),
    ).rejects.toThrow('Plan environment "infra-prod-ci" does not exist');
  });

  it("rejects invalid environment manifests", async () => {
    const client = createClient({
      manifest: JSON.stringify({ version: "" }),
    });

    await expect(
      validateTerraformEnvironmentRelease(
        payload,
        { githubToken: "test-token" },
        client.factory,
      ),
    ).rejects.toThrow(
      'Manifest "infra/resources/prod/environment.json" is invalid',
    );
  });

  it("rejects blank deployment metadata", async () => {
    const client = createClient({
      manifest: JSON.stringify({
        deployment: {
          applyEnvironment: "infra-prod-cd",
          planEnvironment: "infra-prod-ci",
          runnerLabel: " ",
        },
        version: "1.0.0",
      }),
    });

    await expect(
      validateTerraformEnvironmentRelease(
        payload,
        { githubToken: "test-token" },
        client.factory,
      ),
    ).rejects.toThrow(
      'Manifest "infra/resources/prod/environment.json" is invalid',
    );
  });

  it("requires a GitHub token in the task context", async () => {
    const client = createClient();

    await expect(
      validateTerraformEnvironmentRelease(payload, {}, client.factory),
    ).rejects.toThrow(
      "GitHub token is required to validate a Terraform release",
    );
    expect(client.factory).not.toHaveBeenCalled();
  });
});
