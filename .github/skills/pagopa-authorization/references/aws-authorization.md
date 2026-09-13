# AWS authorization reference

Source repository: <https://github.com/pagopa/eng-aws-authorization-v2>

This repository separates account lifecycle, workforce identity, platform
access, and external users. Fetch the current default branch and preserve the
path-derived ownership model before editing.

## Capability map

| User intent | Vertical and state scope | Primary input |
| --- | --- | --- |
| Create or update an AWS account, OU, contacts, cost anomaly, or setup | Account Lifecycle | `data/accounts/<platform>/<environment>/<account>/account.yaml` |
| Add a canonical PagoPA user or global group | Workforce Identity | `data/global-identities/users-pagopa.yml`, `groups-global.yaml` |
| Create a platform/account group or assign a permission set to an account | Platform Access | `groups-platform.yaml`, `groups-account.yaml`, `authorization.yaml` |
| Grant or remove technical/nominal external-user access | External Users | `external_users.yaml`, optional force-reconcile map |

The active source tree is:

```text
data/
├── accounts/
│   └── <platform>/
│       ├── groups-platform.yaml
│       └── <environment>/
│           └── <account>/
│               ├── account.yaml
│               ├── authorization.yaml
│               ├── groups-account.yaml
│               └── external_users.yaml
└── global-identities/
    ├── users-pagopa.yml
    └── groups-global.yaml
```

`account.yaml` is mandatory. The other three account files are optional.
Environment directories are `dev`, `uat`, and `prod`. The final account
directory name must match `account.yaml.name`. Some documentation mentions
legacy catalog filenames; inspect the current tree and workflow rather than
renaming an existing file.

## Account Lifecycle

Use the existing account directory:

```yaml
name: devex-dev
email: team-devex+awsdev@pagopa.it
ou_name: Engineering
anomaly_cost:
  email:
    - person@pagopa.it
    - cloud-engineering@pagopa.it
  threshold: 200
custom_tags: {}
```

The environment is derived from the path, not an arbitrary field. `ou_name`
selects the Organizations hierarchy; the path platform is also used for the
AWS `Platform` tag. Account names are 3-50 characters, declaration emails must
be valid, anomaly-cost metadata accepts 1-3 valid email addresses and a
threshold from 100 to 300, and custom tags must be non-empty scalar values
without reserved managed keys.

Account setup is not an authorization assignment. Do not add users or groups
to `account.yaml` to solve an access request.

## Workforce Identity

Canonical users use `data/global-identities/users-pagopa.yml`:

```yaml
users:
  - user_name: person@pagopa.it
    given_name: Person
    family_name: Example
    active: true
```

The current validator requires canonical `user_name`, `given_name`, and
`family_name` values. Global groups use `groups-global.yaml`:

```yaml
groups:
  - name: OrgReadOnly
    description: Read only access to the master account
    users:
      - person@pagopa.it
```

Group names, memberships, and users must be unique and memberships must refer
to canonical users. Global groups are owned by
`src/30-global-identity-store`; do not redefine them in a platform catalog.

## Platform Access

### Platform and account groups

Both `groups-platform.yaml` and an account's `groups-account.yaml` use the
same envelope:

```yaml
groups:
  - name: EngineeringToolsAdmins
    description: Engineering tools administrators
    users:
      - person@pagopa.it
```

Platform groups belong to `data/accounts/<platform>/groups-platform.yaml`.
Account groups belong to the sibling account directory and should be exactly
`groups: []` when empty. A group name has exactly one owner across global,
platform, and account catalogs. Memberships must use canonical users.

### Account assignments

An account's `authorization.yaml` maps groups to existing permission sets:

```yaml
group_account_mappings:
  - group_name: EngineeringToolsAdmins
    permission_set: FullAdmin
enable_team_security_access: true
```

Do not use `user_account_mappings` or embed `groups` in this file: the active
validator blocks direct-user mappings and embedded group definitions. A mapping
may reference a global group, a group owned by the current platform, or a group
owned by the same account. The account identity comes from the directory; do
not add `account_name` to the YAML.

The `permission_set` must resolve to an existing AWS IAM Identity Center
permission set. If the user asks for a level not present in the repository,
show the available existing permission sets and ask whether a new permission
set is actually intended.

`enable_team_security_access: true` preserves the repository's special
`team-security`/`ReadOnlyAccess` assignment. Do not add it merely because a
user asks for ordinary account access.

## External Users

The optional account file is a YAML list:

```yaml
- type: user
  email: external@example.com
  metadata:
    azienda: Example Ltd
    scopo: Supporto operativo

- type: bot
  username: technical-user
  metadata:
    azienda: Example Ltd
    scopo: Automazione
```

Each record must have exactly one non-empty identity:

- `type: user` with `email`, or
- `type: bot` with `username`.

`metadata` must contain only non-empty string fields `azienda` and `scopo`.
Unknown keys, duplicate identities within an account, mismatched types, and
invalid email or IAM username syntax are rejected. The account must already
resolve to one active AWS Organizations account; create/provision it through
Account Lifecycle first.

External-user reconciliation is asynchronous: Terraform writes desired state
in the management account and a Lambda reconciles target-account IAM users.
Removing a declaration can remove access after reconciliation; report that
runtime effect and do not claim immediate revocation.

When the declaration is unchanged but reconciliation must be retriggered, use
the repository's persistent nested map in
`src/33-iam-external-users/env/management/terraform.tfvars`:

```hcl
external_user_force_reconcile_versions = {
  example-account = {
    "external@example.com" = "1"
  }
}
```

Values are canonical non-negative integer strings of at most 38 digits and
must be increased, then left at the applied value. Do not reset them to `0`.

## Workflow scope and validation

The repository has separate plan/apply families:

- Account: detects `account.yaml`; no manual scope is required for ordinary PRs.
- Global Identity: detects the two `data/global-identities` catalogs.
- Platform Identity: workflow dispatch accepts `platform`; empty means all
  discovered platforms.
- External Users: dispatch accepts `platform` and `account`; empty values use
  detected scope.

The PR check separates `account-lifecycle` from `authorization` changes.
Shared root changes can fan out to several scopes, so inspect the generated
matrix and do not reduce a multi-platform change to one guessed platform.

Useful non-mutating validation:

```bash
./validate-repo-locally.sh --only business-validation
TERRAFORM_TEST_ROOT=src/30-global-identity-store \
  ./scripts/run-terraform-tests.sh
TERRAFORM_TEST_ROOT=src/31-platform-identity-and-access \
  ./scripts/run-terraform-tests.sh
TERRAFORM_TEST_ROOT=src/33-iam-external-users \
  ./scripts/run-terraform-tests.sh
```

Use the focused native tests and current workflow checks for the touched
vertical. Plan is the review boundary; do not run apply as a substitute for a
PR.

## Authoritative source pointers

- [Repository context map](https://github.com/pagopa/eng-aws-authorization-v2/blob/main/CONTEXT-MAP.md)
- [Terraform source/data model](https://github.com/pagopa/eng-aws-authorization-v2/blob/main/docs/terraform.md)
- [Platform Access contract](https://github.com/pagopa/eng-aws-authorization-v2/blob/main/src/31-platform-identity-and-access/README.md)
- [External Users contract](https://github.com/pagopa/eng-aws-authorization-v2/blob/main/src/33-iam-external-users/README.md)
- [Global Identity contract](https://github.com/pagopa/eng-aws-authorization-v2/blob/main/src/30-global-identity-store/README.md)
- [Account Lifecycle contract](https://github.com/pagopa/eng-aws-authorization-v2/blob/main/src/10-accounts-payer-setup/README.md)
