# Azure authorization reference

Source repository: <https://github.com/pagopa/eng-azure-authorization>

Fetch the current default branch before editing. Resolve the Azure root from
the user's target rather than asking the user to know the repository layout.

## Capability map

| User intent | Desired-state scope | Primary input |
| --- | --- | --- |
| Entra ID group, membership, directory role, or management-group RBAC | `src/azure-org/` | `organization/data/groups/*.json`, `externals.json` |
| Azure subscription group/RBAC/VPN access | `src/azure-subscriptions/` | `subscriptions/<SUBSCRIPTION>/terraform.tfvars[.json]` |
| Azure DevOps organization member or external entitlement | `src/azure-devops-org/` | `organization/data/members.json`, `externals.json`, `admins.json` |
| Azure DevOps project, team, member, or team permission | `src/azure-devops-projects/` | `projects/<project-group>/terraform.tfvars.json` |
| Create or associate an Azure subscription | `src/azure-control-tower/` | `resources/subscriptions/subscriptions.yaml` |

Keep each change inside the owning root and its generated workflow scope. If a
request needs an external-user allowlist plus a group assignment, treat the
allowlist as a prerequisite and keep the dependency visible in the PR.

## Entra ID / Azure directory

Group files are JSON objects shaped like:

```json
{
  "name": "team-cloud-engineering",
  "members": [
    "person@pagopa.it"
  ],
  "directory_roles_assigned": ["Global Reader"],
  "directory_roles_eligible": [],
  "azurerm_roles": [
    {
      "role": "Cost Management Contributor",
      "scope": "/providers/Microsoft.Management/managementGroups/pagopa"
    }
  ]
}
```

Use `directory_roles_assigned` for standing directory roles. The field
`directory_roles_eligible` appears in the catalog, but the current
`azure-org` Terraform root materializes `directory_roles_assigned`; verify
current PIM support before promising eligibility. `azurerm_roles` contains
Azure RBAC assignments at arbitrary scopes.

The external-user catalog is under
`src/azure-org/organization/data/externals.json`. Inspect its current schema
before editing because it is also used to generate operational lists. The
current canonical record shape is:

```json
[
  {
    "email": "external@example.com",
    "enabled": true,
    "assignedGroupsCount": 0
  }
]
```

`enabled` controls the synchronized external-user status. The
`assignedGroupsCount` value is maintained as reconciliation metadata; preserve
the current repository convention and do not copy generated CSV fields into a
new record without checking the current sync tool.

## Azure subscription authorization

Use the existing subscription directory and preserve whether it uses HCL or
JSON. When both exist, the repository wrapper uses `terraform.tfvars`.

The main HCL shape is:

```hcl
env_short = "d"
prefix    = "eng"

directory_readers = {
  name                         = "eng-d-directory-readers"
  members                      = ["person@pagopa.it"]
  service_principals_name      = []
  service_principals_object_id = []
}

groups = [
  {
    name    = "eng-d-adgroup-admin"
    members = ["person@pagopa.it"]
    roles   = ["Owner"]

    resource_groups = [
      {
        rg_name  = "resource-group-name"
        rg_roles = ["Reader"]
      }
    ]

    resources = [
      {
        resource_id    = "/subscriptions/<id>/resourceGroups/<rg>/providers/<type>/<name>"
        resource_roles = ["Reader"]
      }
    ]
  }
]

vpn = {
  members = ["person@pagopa.it"]
}
```

The supported contract also contains optional application blocks:
`apiconfig`, `pagopa_crusc8_ui`, `pagopa_shared_toolbox`, `platformsm`,
`portalefatturazione`, and `vpn_legacy`. Application blocks may contain
`members` and `redirect_uris`; `platformsm` may also contain
`public_client_redirect_uris`. Add these only when the user explicitly asks
for the corresponding application access or redirect URI.

Subscription identities commonly use the Entra external-user form
`username_pagopa.it#EXT#@ttdio.onmicrosoft.com`, but first resolve the
repository's current external-user flow and exact spelling. Do not normalize an
identity that already exists in the file.

## Azure DevOps organization

The organization catalog is separate from Azure directory:

```json
[
  {
    "email": "person@pagopa.it",
    "license_type": "basic"
  }
]
```

Use the current `members.json`, `externals.json`, or `admins.json` under
`src/azure-devops-org/organization/data/`. Preserve the repository's accepted
license values (current examples include `basic` and `stakeholder`).

## Azure DevOps projects

Edit `src/azure-devops-projects/projects/<project-group>/terraform.tfvars.json`:

```json
{
  "projects": [
    {
      "name": "example-project",
      "description": "Project description",
      "visibility": "private",
      "work_item_template": "Basic",
      "teams": [
        {
          "name": "example-team",
          "description": "Team description",
          "members": ["person@pagopa.it"],
          "permissions": ["Contributors"]
        }
      ]
    }
  ]
}
```

`visibility` is `private` or `public`. `work_item_template` is one of
`Agile`, `Basic`, `CMMI`, or `Scrum`. Permissions are assigned through teams,
not directly to individual users. A request for direct user permissions must
therefore be translated into team membership plus an existing team permission,
or clarified if no suitable team exists.

The repository currently contains project-group directories with names such
as `__ENGINEERING`. Workflows may use a different display/scope name. Resolve
the actual path and workflow from the current tree instead of guessing from a
human-facing label.

## Subscription lifecycle / Control Tower

The strict source file is
`src/azure-control-tower/resources/subscriptions/subscriptions.yaml`:

```yaml
subscriptions:
  dev-example:
    create: true
    subscription_name: DEV-EXAMPLE
    state: Enabled
    enrollment_account_name: "401099"
    management_group_id: dev_technology
    creator_owner: person@pagopa.it
    prefix: example
    tags: {}
```

`create`, `subscription_name`, `state`, `enrollment_account_name`, and
`management_group_id` are required. `creator_owner`, `prefix`, and `tags` are
optional according to the current contract. Azure states are `Enabled`,
`Disabled`, `Warned`, `PastDue`, and `Deleted`. The schema is strict: missing
or extra fields fail validation. Subscription creation can also scaffold the
subscription authorization files and workflows; do not hand-create generated
files unless the current source workflow requires it.

## Validate and report

Use the root's backend-free checks when possible:

```bash
terraform fmt -check -recursive
terraform init -backend=false -lockfile=readonly
terraform validate -no-color
```

For a subscription plan, use the wrapper from `src/azure-subscriptions`:

```bash
./terraform.sh plan <SUBSCRIPTION>
```

For Azure DevOps projects:

```bash
./terraform.sh plan <project-group>
```

Never claim that a Terraform declaration is active without a plan result or a
live Azure/Azure DevOps lookup. Use the [live-state reference](./live-state.md)
for read-only provider checks.

## Authoritative source pointers

- [Repository overview and routes](https://github.com/pagopa/eng-azure-authorization/blob/main/README.md)
- [Contribution and identity conventions](https://github.com/pagopa/eng-azure-authorization/blob/main/CONTRIBUTING.md)
- [Subscription contract](https://github.com/pagopa/eng-azure-authorization/blob/main/src/azure-subscriptions/README.md)
- [Azure DevOps project contract](https://github.com/pagopa/eng-azure-authorization/blob/main/src/azure-devops-projects/README.md)
- [Subscription lifecycle contract](https://github.com/pagopa/eng-azure-authorization/blob/main/src/azure-control-tower/README.md)
