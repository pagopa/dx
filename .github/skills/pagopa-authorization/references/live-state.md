# Declared state versus live state

Authorization repositories are desired-state catalogs. A committed entry says
what the next authorized apply should converge to; it does not prove that the
provider currently grants the access. Always label the source and timestamp of
read-only observations.

## Reporting contract

Use one of these labels:

- **Declared**: read from the current default branch of the authorization
  repository.
- **Live**: read from the provider API/CLI with an authenticated session.
- **Unverified**: inferred from a declaration or blocked by missing credentials.

For a change request, inspect both declared state and live state when possible.
If they differ, report the drift and do not silently rewrite the repository to
match live state.

## GitHub

Use `gh api` with the `pagopa` organization and `--paginate` where the endpoint
supports it. Useful read-only lookups include:

```bash
gh api --paginate /orgs/pagopa/members
gh api --paginate /orgs/pagopa/teams
gh api /orgs/pagopa/teams/<team-slug>/repos
gh api --paginate /repos/pagopa/<repo>/collaborators
gh api --paginate /orgs/pagopa/installations
gh api /app/installations/<installation-id>/repositories
```

Use the repository's `apps.json` to map an installation to the declared
repository set, then compare it with the live installation repositories.
Do not infer App permission scopes from `apps.json`; query the App settings or
installation metadata when the user asks about App permissions.

## Azure and Azure DevOps

Use read-only Azure CLI/API commands only when the required login and tenant
context are already available:

```bash
az account show -o json
az role assignment list --scope <scope> -o json
az ad group member list --group <group-id-or-name> -o json
az devops project list -o json
az devops team list --project <project> -o json
az devops user list -o json
```

For Entra directory roles or PIM eligibility, use the current Microsoft Graph
or `az rest` endpoint appropriate to the tenant; do not substitute ordinary
Azure RBAC results. Record tenant, subscription/project, principal, role, and
query time. Azure DevOps commands also require the configured organization and
project context.

## AWS

Use read-only AWS CLI calls with the intended profile/role and region. Resolve
the Identity Center instance, permission-set ARN, and account ID before
reporting an assignment:

```bash
aws organizations list-accounts --output json
aws identitystore list-users --identity-store-id <identity-store-id> --output json
aws identitystore list-groups --identity-store-id <identity-store-id> --output json
aws identitystore list-group-memberships \
  --identity-store-id <identity-store-id> \
  --group-id <group-id> \
  --output json
aws sso-admin list-account-assignments \
  --instance-arn <instance-arn> \
  --account-id <12-digit-account-id> \
  --permission-set-arn <permission-set-arn> \
  --output json
```

For External Users, distinguish:

1. the declared `external_users.yaml` record;
2. the management-account desired-state item;
3. reconciliation status;
4. the target-account IAM user/group membership.

The repository's Lambda performs the last step asynchronously. A desired-state
Terraform plan or DynamoDB item is not proof that the target IAM user has
already converged.

## Credentials and failure handling

- Do not ask the user to paste credentials, access tokens, private keys, or
  passwords into chat or files.
- If a CLI lookup fails because credentials or tenant context are absent, say
  which live fact is unavailable and continue with a declared-state answer when
  possible.
- Do not turn an API error into an empty successful result.
- Prefer narrow queries for one principal, target, and scope; avoid dumping
  organization-wide identities into the response.
- When live state contains sensitive or unnecessary personal data, summarize
  only the relevant identity and authorization facts.

