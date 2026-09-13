# Authorization PR contracts

Use this reference when preparing a PR description. The desired-state files
are the real input contract; the PR body supplies review context and must not
invent unsupported configuration fields.

## Titles

The three source repositories validate conventional titles with one of:
`feat`, `fix`, `docs`, `chore`, or `breaking`. GitHub's current template does
not impose the rule in the template itself, but its PR-title workflow applies
the same validation. Prefer:

```text
feat(<scope>): <short authorization change>
```

Examples:

```text
feat(github): grant dx repository access to the DevEx team
feat(azure): add Reader access to DEV-ENGINEERING
feat(aws): map EngineeringToolsAdmins to engineering-tools-dev
```

Use `fix` when correcting an existing declaration, `chore` for maintenance,
and `breaking` only when an existing access contract is intentionally broken.

## GitHub PR body

The source template requires these sections:

```markdown
## Description

## Change Type

- [ ] Github: Organization member add/update/remove
- [ ] Github: Team creation/update/removed
- [ ] Github: Repository permission update/remove
- [ ] Github: External collaborator update/remove
- [ ] Github: Terraform/script automation
- [ ] Github: Data registry/JSON policy
- [ ] Github: Github APP installation/update/remove
- [ ] Code feature/Bug fix
- [ ] Security update
- [ ] Refactor/Performance improvement
- [ ] Test update
- [ ] CI/CD/Github actions workflow update
- [ ] Configuration/Permissions update
- [ ] Documentation update
- [ ] Copilot AI
- [ ] Other

## List of changes

## Scope and Risk

- Affected organizations/teams/repositories:
- Permission levels impacted:
- Risk level: `low` / `medium` / `high`
- Rollback strategy:

## Testing Instructions

1.
2.

## Validation Evidence

- Terraform plan summary:
- JSON/data validation summary:
- Python/script validation summary:

## Breaking Changes

- [ ] This PR contains breaking changes

## Checklist

- [ ] Permission levels follow least-privilege and are justified
- [ ] User/team naming and sorting conventions are respected
- [ ] JSON authorization files are valid and consistent
- [ ] `terraform fmt -recursive` and `terraform validate` executed when applicable
- [ ] No sensitive data or tokens included
```

Select only the relevant change-type checkbox and replace all placeholders.
For an App request, list the App name, installation ID, area, repository list,
manager team/users, and whether the request is org-wide. Explain that App
permissions themselves are managed in GitHub App settings, not by
`apps.json`.

## Azure PR body

The source template requires:

```markdown
## Summary

- Goal:
- Why:

## Scope

### Change type

- [ ] Subscription creation or configuration
- [ ] Subscription access / RBAC / PIM
- [ ] Entra ID user or group change
- [ ] Azure DevOps project or permission change
- [ ] Terraform / automation change
- [ ] Documentation only
- [ ] Github workflow change
- [ ] Other

## Changes

### Targets and context

- Request / ticket:
- Affected subscriptions / management groups:
- Affected Azure DevOps projects:
- Affected users / groups / service principals:
- Temporary or external access expiry (if applicable):

## Validation

### Automated checks

- `terraform fmt -recursive`:
- `terraform validate`:
- Other checks:

### Functional checks

- Manual verification performed:
- Non-production evidence or notes:

## Risk and Rollback

- Risk level: `low` / `medium` / `high`
- Rollback plan:

## Reviewer Notes

- Focus areas for reviewers:
- Additional context:

## Checklist

- [ ] Identities, group names, and subscription/project targets are correct
- [ ] Least-privilege principle is respected
- [ ] Required validation was completed for the touched scope
- [ ] Sensitive data is not exposed in committed files
```

If an expiry is not represented in the data schema, keep it in the PR context
and describe the operational removal needed; do not add an arbitrary
`expires_at` property.

## AWS PR body

The source template requires:

```markdown
## Description

## Change Type

- [ ] Account onboarding or setup update
- [ ] IAM role/policy/permission change
- [ ] User/group authorization update
- [ ] Script/automation update
- [ ] CI/CD or repository configuration update
- [ ] Documentation only
- [ ] Other

## List of changes

## Scope and Impact

- Affected paths:
- Affected environments: `dev` / `uat` / `prod`
- Security impact summary:
- Rollback strategy:

## IAM Blast Radius

- Affected AWS accounts:
- Affected IAM principals/roles:
- Escalation risk notes:

## Request Context

- Access request reference (if applicable):
- Expiration date for external access (if applicable):

## Testing Instructions

1.
2.

## Validation Evidence

- Terraform plan summary:
- Additional checks run:

## Breaking Changes

- [ ] This PR contains breaking changes

## Checklist

- [ ] Follows repository conventions and naming rules
- [ ] No secrets or credentials committed
- [ ] YAML/JSON files are valid and sorted where required
- [ ] `terraform fmt -recursive` and `terraform validate` executed (for Terraform changes)
- [ ] Script checks executed (`bash -n` / Python checks) when scripts changed
```

For AWS external users, include the target platform/account, identity type,
company and purpose, whether reconciliation is asynchronous, and any requested
force-reconcile version. For Platform Access, list every group-to-permission-set
mapping and the resolved account names.

## Final PR checklist

Before opening a PR:

- Confirm the repository, branch, and base are correct.
- Confirm the changed paths are within one allowed scope.
- Confirm every identity and target resolves in the current desired state.
- Include least-privilege reasoning and rollback.
- Include validation commands and actual results, not planned commands.
- State whether live provider verification was performed.
- Remove secrets, tokens, private keys, passwords, and unnecessary personal data.

Source templates:

- [GitHub](https://github.com/pagopa/eng-github-authorization/blob/main/.github/PULL_REQUEST_TEMPLATE.md)
- [Azure](https://github.com/pagopa/eng-azure-authorization/blob/main/.github/PULL_REQUEST_TEMPLATE.md)
- [AWS](https://github.com/pagopa/eng-aws-authorization-v2/blob/main/.github/PULL_REQUEST_TEMPLATE.md)
