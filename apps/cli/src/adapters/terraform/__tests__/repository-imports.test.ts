/**
 * Declarative import coverage for every managed bootstrap-module resource type.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  recoverRepositoryState,
  repositoryImportId,
  type RepositoryImportResource,
} from "../repository-imports.js";

const github = { owner: "pagopa", repo: "test-repo" };
const resource = (
  type: string,
  after: Record<string, unknown> = {},
  name = "this",
): RepositoryImportResource => ({
  address: `module.github_repository.${type}.${name}`,
  change: { actions: ["create"], after },
  mode: "managed",
  type,
});

describe("repository import identifiers", () => {
  it.each([
    { after: {}, expected: "test-repo", type: "github_repository" },
    { after: {}, expected: "test-repo", type: "github_branch_default" },
    {
      after: {},
      expected: "test-repo",
      type: "github_actions_repository_permissions",
    },
    {
      after: {},
      expected: "test-repo",
      type: "github_repository_vulnerability_alerts",
    },
    {
      after: { branch: "main" },
      expected: "test-repo:main",
      type: "github_branch",
    },
    {
      after: { pattern: "main" },
      expected: "test-repo:main",
      type: "github_branch_protection",
    },
    {
      after: { environment: "infra-ced-prod-cd" },
      expected: "test-repo:infra-ced-prod-cd",
      type: "github_repository_environment",
    },
  ])(
    "resolves $type without unnecessary API calls",
    async ({ after, expected, type }) => {
      const readJson = vi.fn();
      await expect(
        repositoryImportId(resource(type, after), github, readJson),
      ).resolves.toBe(expected);
      expect(readJson).not.toHaveBeenCalled();
    },
  );

  it("finds branch and tag policies across paginated GitHub results", async () => {
    const readJson = vi.fn(async () => [
      { branch_policies: [{ id: 100, name: "main", type: "tag" }] },
      { branch_policies: [{ id: 200, name: "main", type: "branch" }] },
    ]);
    const id = await repositoryImportId(
      resource("github_repository_environment_deployment_policy", {
        branch_pattern: "main",
        environment: "infra-prod-cd",
      }),
      github,
      readJson,
    );
    expect(id).toBe("test-repo:infra-prod-cd:200");
    expect(readJson).toHaveBeenCalledWith(
      "repos/pagopa/test-repo/environments/infra-prod-cd/deployment-branch-policies?per_page=100",
    );
  });

  it("requires an unambiguous remote deployment policy", async () => {
    const entry = resource("github_repository_environment_deployment_policy", {
      environment: "infra-prod-cd",
      tag_pattern: "v*",
    });
    await expect(
      repositoryImportId(entry, github, async () => [{ branch_policies: [] }]),
    ).rejects.toThrow("Cannot uniquely identify");
    await expect(
      repositoryImportId(entry, github, async () => ({ wrong: [] })),
    ).rejects.toThrow("invalid deployment policy");
  });

  it("finds autolink identifiers by key prefix", async () => {
    await expect(
      repositoryImportId(
        resource("github_repository_autolink_reference", { key_prefix: "DX-" }),
        github,
        async () => [[{ id: 42, key_prefix: "DX-" }]],
      ),
    ).resolves.toBe("test-repo:42");
  });

  it("recreates only the known idempotent workflow-permissions null resource", async () => {
    await expect(
      repositoryImportId(
        resource("null_resource", {}, "workflow_permissions"),
        github,
        vi.fn(),
      ),
    ).resolves.toBeUndefined();
    await expect(
      repositoryImportId(resource("null_resource"), github, vi.fn()),
    ).rejects.toThrow("does not support");
  });

  it("fails explicitly for unsupported module resources and unknown attributes", async () => {
    await expect(
      repositoryImportId(resource("github_team"), github, vi.fn()),
    ).rejects.toThrow("does not support");
    await expect(
      repositoryImportId(resource("github_branch"), github, vi.fn()),
    ).rejects.toThrow("Cannot determine branch");
  });
});

describe("repository recovery", () => {
  let repositoryPath: string;

  beforeEach(async () => {
    repositoryPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "dx-import-test-"),
    );
  });
  afterEach(async () => {
    await fs.rm(repositoryPath, { recursive: true });
  });

  it("generates import blocks and applies only a checked saved plan", async () => {
    const resources = [
      resource("github_repository"),
      resource("github_branch", { branch: "main" }, "main"),
      resource("null_resource", {}, "workflow_permissions"),
    ];
    const run = vi.fn(async (args: string[]) => ({
      stdout:
        args[0] === "show"
          ? JSON.stringify({ resource_changes: resources })
          : "",
    }));

    await recoverRepositoryState(repositoryPath, github, run, vi.fn());

    const imports = await fs.readFile(
      path.join(repositoryPath, "repository-state-imports.tf"),
      "utf8",
    );
    expect(imports).toContain(
      "to = module.github_repository.github_repository.this",
    );
    expect(imports).toContain('id = "test-repo:main"');
    expect(imports).not.toContain("provider =");
    expect(imports).not.toContain("null_resource");
    expect(run.mock.calls.map(([args]) => args[0])).toEqual([
      "plan",
      "show",
      "plan",
      "show",
      "apply",
    ]);
    const apply = run.mock.lastCall?.[0];
    expect(apply?.slice(0, 2)).toEqual(["apply", "-input=false"]);
  });

  it("preserves import blocks after an apply failure so recovery can be retried", async () => {
    const run = vi.fn(async (args: string[]) => {
      if (args[0] === "apply") throw new Error("Provider unavailable");
      return {
        stdout: JSON.stringify({
          resource_changes: [resource("github_repository")],
        }),
      };
    });
    await expect(
      recoverRepositoryState(repositoryPath, github, run, vi.fn()),
    ).rejects.toThrow("Provider unavailable");
    const existing = await fs.readFile(
      path.join(repositoryPath, "repository-state-imports.tf"),
      "utf8",
    );
    run.mockImplementation(async () => ({
      stdout: JSON.stringify({
        resource_changes: [resource("github_repository")],
      }),
    }));
    await recoverRepositoryState(repositoryPath, github, run, vi.fn());
    await expect(
      fs.readFile(
        path.join(repositoryPath, "repository-state-imports.tf"),
        "utf8",
      ),
    ).resolves.toBe(existing);
  });

  it("never applies a recovery plan that destroys or replaces a resource", async () => {
    const changed = resource("github_repository");
    changed.change.actions = ["delete", "create"];
    const run = vi.fn(async (args: string[]) => ({
      stdout:
        args[0] === "show"
          ? JSON.stringify({ resource_changes: [changed] })
          : "",
    }));
    await expect(
      recoverRepositoryState(repositoryPath, github, run, vi.fn()),
    ).rejects.toThrow("destroy or replace");
    expect(run.mock.calls.some(([args]) => args[0] === "apply")).toBe(false);
  });

  it("validates Terraform-generated addresses before writing executable HCL", async () => {
    const invalid = resource("github_repository");
    invalid.address = "invalid } injected";
    const run = vi.fn(async () => ({
      stdout: JSON.stringify({ resource_changes: [invalid] }),
    }));
    await expect(
      recoverRepositoryState(repositoryPath, github, run, vi.fn()),
    ).rejects.toThrow("unsupported repository recovery plan");
  });

  it("does not adopt an unrelated file at the recovery imports path", async () => {
    await fs.writeFile(
      path.join(repositoryPath, "repository-state-imports.tf"),
      "# User-maintained imports\n",
    );
    const run = vi.fn();
    await expect(
      recoverRepositoryState(repositoryPath, github, run, vi.fn()),
    ).rejects.toThrow("unexpected contents");
    expect(run).not.toHaveBeenCalled();
  });
});
