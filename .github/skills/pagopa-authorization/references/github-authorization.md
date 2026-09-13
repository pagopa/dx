# GitHub authorization reference

Source repository: <https://github.com/pagopa/eng-github-authorization>

Use this reference after routing a request to GitHub. Fetch the current
repository before editing; the paths and examples below describe the verified
contract and point to the authoritative documentation.

## Capability map

| User intent | Desired-state scope | Primary input |
| --- | --- | --- |
| Add, change, or remove an organization member | `organization/` | `organization/data/members.json` |
| Add or remove an organization administrator | `organization/` | `organization/data/admins.json` |
| Allow an external identity to be used by authorization data | `organization/` | `organization/data/externals.json` |
| Create a team or change team membership | `authorizations/<area>/` | Any `data/*.json` with `teams` |
| Give a team repository access | `authorizations/<area>/` | Any `data/*.json` with `repos[].team_associations` |
| Give a direct collaborator repository access | `authorizations/<area>/` | Any `data/*.json` with `repos[].collaborators` |
| Reuse several external collaborators | `authorizations/<area>/` | Any `data/*.json` with `collaborator_groups` and repository associations |
| Install/link a GitHub App to repositories | `authorizations/<area>/` | Exactly `authorizations/<area>/data/apps.json` |

Organization membership is separate from area authorization. An area cannot
grant access to a username absent from the organization data. An external
collaborator must first be present in `externals.json`; that file is an
allowlist, not a grant.

## Repository layout and scope

```text
organization/
├── backend.tfvars
├── main.tf
├── users.tf
├── variables.tf
└── data/
    ├── members.json
    ├── admins.json
    └── externals.json

authorizations/<area>/
├── backend.tfvars
├── variables.tfvars
├── slack_channels.json
└── data/
    ├── *.json
    └── apps.json
```

Area JSON file names are arbitrary and are collected recursively. `apps` is
the exception: only the exact root file `data/apps.json` is read. A block named
`apps` in another JSON file is ignored. An App may target only repositories
declared in the same area.

Keep a pull request inside exactly one of:

- `organization/`
- `authorizations/<area>/`

## Input contracts

### Organization records

`members.json`, `admins.json`, and `externals.json` are arrays of records:

```json
[
  {
    "email": "person@pagopa.it",
    "username": "github-user"
  }
]
```

`members.json` and `admins.json` require `@pagopa.it` addresses. `externals.json`
is validated separately and does not grant repository access by itself.

### Teams and collaborator groups

```json
{
  "teams": [
    {
      "team_name": "engineering-team-devex",
      "members": [
        {
          "username": "github-user",
          "role": "member"
        }
      ]
    }
  ],
  "collaborator_groups": [
    {
      "collaborator_group_name": "vendor-engineers",
      "members": ["external-user"]
    }
  ]
}
```

Team members must already be organization members. Team membership uses only
`role: "member"`. Group members refer to GitHub usernames already present in
the organization's data.

### Repository access

```json
{
  "repos": [
    {
      "repo_name": "dx",
      "collaborators": [
        {
          "username": "github-user",
          "role": "push"
        }
      ],
      "team_associations": [
        {
          "team_name": "engineering-team-devex",
          "permission": "maintain"
        }
      ],
      "collaborator_group_associations": [
        {
          "collaborator_group_name": "vendor-engineers",
          "permission": "push"
        }
      ]
    }
  ]
}
```

Allowed direct-collaborator roles and team/group repository permissions are:
`pull`, `triage`, `push`, `maintain`, `admin`. Use the narrowest requested
level. Repository and team names are unique across authorization areas
(case-insensitively).

### GitHub App installation

Put this object only in `authorizations/<area>/data/apps.json`:

```json
{
  "apps": [
    {
      "app_name": "engineering-github-runner-app",
      "installation_id": "104183560",
      "repositories": ["engineering", "dx"],
      "app_managers": {
        "teams": ["engineering-team-devex"],
        "users": []
      },
      "org_wide": false,
      "description": "GitHub Runner App for Engineering"
    }
  ]
}
```

Each App record must contain exactly these fields:
`app_name`, `installation_id`, `repositories`, `app_managers`, `org_wide`,
`description`. `app_managers` must contain at least one team or user. Do not
invent permissions inside this repository: the file links an installed App to
repositories; App permission configuration belongs to the GitHub App itself.
If the user asks to change App permissions, report this boundary and route the
permission change to the App owner/settings workflow rather than adding
unsupported fields here. Resolve `installation_id` from the live GitHub API
when possible.

## Read and validate

For declared state, inspect the current default branch in the source
repository. For effective state, use the [live-state reference](./live-state.md)
and label the result separately.

Run the smallest applicable checks from the source repository:

```bash
make validate-json
bash scripts/check-pr-structure/structural-json-checks.sh
python3 -m pytest tests/scripts/check_pr_structure/test_validate_authorization_apps_json.py
make validate-terraform
```

Use the focused App validator only when `data/apps.json` is present:

```bash
python3 scripts/check-pr-structure/validate_authorization_apps_json.py \
  --path authorizations/<area>
```

The validator skips a missing `apps.json`, but rejects invalid JSON, missing
required fields, and unexpected fields.

## Authoritative source pointers

- [Repository workflow and user-facing capabilities](https://github.com/pagopa/eng-github-authorization/blob/main/README.md)
- [Area layout and scope rules](https://github.com/pagopa/eng-github-authorization/blob/main/authorizations/README.md)
- [App schema validator](https://github.com/pagopa/eng-github-authorization/blob/main/scripts/check-pr-structure/README.md)
- [Organization data](https://github.com/pagopa/eng-github-authorization/tree/main/organization/data)
- [Authorization areas](https://github.com/pagopa/eng-github-authorization/tree/main/authorizations)
