/**
 * Independent provider import IDs and GitHub API pages for recovery contracts.
 */
import fs from "node:fs/promises";
import path from "node:path";

const imports = [
  {
    address: "module.github_repository.github_repository.this",
    after: { name: "test-repo" },
    id: "test-repo",
    type: "github_repository",
  },
  {
    address: "module.github_repository.github_branch_default.main",
    after: { branch: "main" },
    id: "test-repo",
    type: "github_branch_default",
  },
  {
    address: "module.github_repository.github_branch.development",
    after: { branch: "development" },
    id: "test-repo:development",
    type: "github_branch",
  },
  {
    address: "module.github_repository.github_branch_protection.main",
    after: { pattern: "main" },
    id: "test-repo:main",
    type: "github_branch_protection",
  },
  {
    address:
      "module.github_repository.github_actions_repository_permissions.repo",
    after: {},
    id: "test-repo",
    type: "github_actions_repository_permissions",
  },
  {
    address:
      'module.github_repository.github_repository_environment.this["cgn:prod"]',
    after: { environment: "cgn:prod" },
    id: "test-repo:cgn??prod",
    type: "github_repository_environment",
  },
  {
    address:
      "module.github_repository.github_repository_environment_deployment_policy.branch",
    after: { branch_pattern: "main", environment: "cgn:prod" },
    id: "test-repo:cgn??prod:11",
    type: "github_repository_environment_deployment_policy",
  },
  {
    address:
      "module.github_repository.github_repository_environment_deployment_policy.tag",
    after: { environment: "cgn:prod", tag_pattern: "main" },
    id: "test-repo:cgn??prod:12",
    type: "github_repository_environment_deployment_policy",
  },
  {
    address:
      "module.github_repository.github_repository_autolink_reference.jira",
    after: { key_prefix: "DX-" },
    id: "test-repo:42",
    type: "github_repository_autolink_reference",
  },
];

export const recoveryPlan = {
  resource_changes: [
    ...imports.map(({ address, after, type }) => ({
      address,
      change: { actions: ["create"], after },
      mode: "managed",
      type,
    })),
    {
      address: "module.github_repository.null_resource.workflow_permissions",
      change: { actions: ["create"], after: {} },
      mode: "managed",
      type: "null_resource",
    },
  ],
};

const recoveredRepository = {
  instances: [
    { attributes: { full_name: "pagopa/test-repo", id: "test-repo" } },
  ],
  mode: "managed",
  module: "module.github_repository",
  name: "this",
  type: "github_repository",
};

export const recoveredState = JSON.stringify({
  lineage: "fixture-recovered-lineage",
  resources: [
    recoveredRepository,
    {
      instances: [{ attributes: { id: "test-repo:main" } }],
      mode: "managed",
      module: "module.github_repository",
      name: "main",
      type: "github_branch_protection",
    },
    {
      instances: [
        { attributes: { id: "test-repo:cgn??prod" }, index_key: "cgn:prod" },
      ],
      mode: "managed",
      module: "module.github_repository",
      name: "this",
      type: "github_repository_environment",
    },
  ],
  serial: 10,
  version: 4,
});

export const seedRecovery = async (root: string) => {
  const files = {
    "github-pages.json": JSON.stringify({
      "repos/pagopa/test-repo/autolinks?per_page=100": [
        [{ id: 5, key_prefix: "OTHER-" }],
        [{ id: 42, key_prefix: "DX-" }],
      ],
      "repos/pagopa/test-repo/environments/cgn%3Aprod/deployment-branch-policies?per_page=100":
        [
          { branch_policies: [{ id: 11, name: "main", type: "branch" }] },
          { branch_policies: [{ id: 12, name: "main", type: "tag" }] },
        ],
    }),
    "partial-recovery.tfstate": JSON.stringify({
      lineage: "fixture-recovered-lineage",
      resources: [recoveredRepository],
      serial: 1,
      version: 4,
    }),
    "provider-import-ids.json": JSON.stringify(
      Object.fromEntries(imports.map(({ address, id }) => [address, id])),
    ),
    "recovered.tfstate": recoveredState,
    "recovery-plan.json": JSON.stringify(recoveryPlan),
  };
  await Promise.all(
    Object.entries(files).map(([name, content]) =>
      fs.writeFile(path.join(root, name), content),
    ),
  );
};
