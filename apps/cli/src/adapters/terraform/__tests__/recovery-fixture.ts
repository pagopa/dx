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

const repositoryAttributes = {
  full_name: "pagopa/test-repo",
  id: "test-repo",
  name: "test-repo",
  node_id: "R_kgDOFixture",
};

export const importedRecoveryPlan = {
  resource_changes: recoveryPlan.resource_changes.map((resource) => {
    const attributes =
      resource.type === "github_repository"
        ? repositoryAttributes
        : resource.change.after;
    const imported = imports.find(
      ({ address }) => address === resource.address,
    );
    return {
      ...resource,
      change: {
        actions: imported ? ["no-op"] : ["create"],
        after: attributes,
        before: imported ? attributes : null,
        ...(imported ? { importing: { id: imported.id } } : {}),
      },
    };
  }),
};

const recoveredRepository = {
  instances: [{ attributes: repositoryAttributes, schema_version: 1 }],
  mode: "managed",
  module: "module.github_repository",
  name: "this",
  provider: 'provider["registry.terraform.io/integrations/github"]',
  type: "github_repository",
};

const importedProtection = {
  instances: [
    {
      attributes: {
        id: "BPR_kwDOFixture",
        pattern: "main",
        repository_id: "R_kgDOFixture",
      },
      dependencies: ["module.github_repository.github_repository.this"],
      private: "eyJzY2hlbWFfdmVyc2lvbiI6IjIifQ==",
      schema_version: 2,
    },
  ],
  mode: "managed",
  module: "module.github_repository",
  name: "main",
  provider: 'provider["registry.terraform.io/integrations/github"]',
  type: "github_branch_protection",
};

export const providerRecoveryPlan = {
  resource_changes: importedRecoveryPlan.resource_changes.map((resource) =>
    resource.type === "github_branch_protection"
      ? {
          ...resource,
          change: {
            ...resource.change,
            actions: ["delete", "create"],
            after: { pattern: "main", repository_id: "test-repo" },
            after_unknown: { id: true },
            before: importedProtection.instances[0].attributes,
            replace_paths: [["repository_id"]],
          },
        }
      : resource,
  ),
};

export const reconciledRecoveryState = {
  lineage: "fixture-recovered-lineage",
  outputs: {
    repository_name: { sensitive: false, type: "string", value: "test-repo" },
  },
  resources: [
    recoveredRepository,
    {
      ...importedProtection,
      instances: [
        {
          ...importedProtection.instances[0],
          attributes: {
            ...importedProtection.instances[0].attributes,
            repository_id: "test-repo",
          },
        },
      ],
    },
  ],
  serial: 3,
  terraform_version: "1.16.0",
  version: 4,
};

export const taintedRecoveryState = JSON.stringify({
  lineage: "fixture-recovered-lineage",
  resources: [
    recoveredRepository,
    {
      instances: [
        {
          attributes: {
            id: "workflow-helper",
            triggers: { repo: "pagopa/test-repo" },
          },
          status: "tainted",
        },
      ],
      mode: "managed",
      module: "module.github_repository",
      name: "workflow_permissions",
      type: "null_resource",
    },
  ],
  serial: 2,
  version: 4,
});

export const recoveredState = JSON.stringify({
  lineage: "fixture-recovered-lineage",
  resources: [
    recoveredRepository,
    {
      instances: [
        {
          attributes: {
            id: "BPR_kwDOFixture",
            pattern: "main",
            repository_id: "test-repo",
          },
        },
      ],
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
    "imported-recovery-plan.json": JSON.stringify(importedRecoveryPlan),
    "partial-recovery.tfstate": JSON.stringify({
      lineage: "fixture-recovered-lineage",
      resources: [recoveredRepository],
      serial: 1,
      version: 4,
    }),
    "provider-import-ids.json": JSON.stringify(
      Object.fromEntries(imports.map(({ address, id }) => [address, id])),
    ),
    "provider-import-state.json": JSON.stringify({
      ...reconciledRecoveryState,
      resources: [recoveredRepository, importedProtection],
    }),
    "recovered.tfstate": recoveredState,
    "recovery-plan.json": JSON.stringify(recoveryPlan),
    "tainted-recovery.tfstate": taintedRecoveryState,
  };
  await Promise.all(
    Object.entries(files).map(([name, content]) =>
      fs.writeFile(path.join(root, name), content),
    ),
  );
};
