---
name: pagopa-authorization
description: Translate natural-language requests for PagoPA GitHub, Azure, and AWS authorizations into the correct desired-state repository, capability, input files, and PR-ready change. Use for GitHub organization membership, teams, repository or collaborator access, GitHub App installations, Azure Entra groups and RBAC, Azure subscriptions, Azure DevOps users, projects and teams, subscription lifecycle, AWS accounts, IAM Identity Center groups and permission sets, AWS platform or account access, external users, or requests to inspect declared versus live permissions.
---

# PagoPA authorization broker

Act as the abstraction layer between the user and the PagoPA authorization
repositories. Hide repository names, capability names, paths, and file syntax
unless the user asks for them. The source repositories are authoritative; the
bundled references are a verified routing and schema map, not a replacement for
checking the current default branch.

## Route the request

Classify the request before asking questions:

| Intent | Meaning |
| --- | --- |
| `inspect-declared` | Read the desired state committed in an authorization repository. |
| `inspect-live` | Query the provider API/CLI and report effective access. |
| `prepare-change` | Edit desired state and prepare validation and a PR description. |
| `open-pr` | Prepare and open a PR only when the user explicitly asks for it. |

Then identify the provider and load only the matching reference:

- GitHub: [GitHub authorization reference](./references/github-authorization.md)
- Azure: [Azure authorization reference](./references/azure-authorization.md)
- AWS: [AWS authorization reference](./references/aws-authorization.md)
- PR text and title: [PR contracts](./references/pr-contracts.md)
- Declared versus effective access: [Live-state reference](./references/live-state.md)

If the request spans providers or independent authorization scopes, split it
into separate changes and explain the split briefly. Never put unrelated
provider scopes in one PR.

## Minimal UX workflow

1. Translate the user's words into a capability and target. Resolve names from
   the current repository contents before asking for paths, file names, or
   internal identifiers.
2. Search the selected repository for existing users, teams, repositories,
   groups, subscriptions, accounts, permission sets, or projects. Reuse an
   existing object when it matches; do not invent a new group or permission
   set to avoid one missing decision.
3. Ask only for unresolved values that change the authorization decision:
   identity, target, scope, permission level, business reason for external
   access, or an explicit choice between two plausible existing objects.
   Prefer one concise question containing all missing values.
4. Before editing, show a compact proposal: provider, target, principal,
   effective permission, desired-state file(s), and expected blast radius.
   Do not ask the user to repeat the repository's schema.
5. Edit only the smallest desired-state scope. Preserve existing ordering,
   naming, formatting, and neighboring entries. Never edit Terraform state,
   generated outputs, or provider resources directly.
6. Validate with the provider reference. Stop on contract errors; do not hide
   them behind a successful-looking summary.
7. Produce a PR title and body from [PR contracts](./references/pr-contracts.md).
   Include exact files, identities, targets, permission levels, validation
   evidence, risk, rollback, and any expiry or follow-up that the schema cannot
   represent.
8. Do not commit, push, or open a PR unless the user explicitly requested that
   action. A prepared patch and PR body are sufficient for `prepare-change`.
9. For read-only answers, label every result as **declared**, **live**, or
   **unverified**. Never present repository desired state as proof that access
   is currently effective.

## Safety and scope rules

- Apply least privilege. If the user asks for broad access, surface the
  narrower existing alternative before changing anything.
- Treat `admin`, `Owner`, `FullAdmin`, production access, organization
  membership, directory roles, and external-user access as high-impact. Ask
  for the missing justification or target rather than guessing.
- Preserve one authorization scope per PR. For GitHub this means exactly one
  `organization/` scope or one `authorizations/<area>/` scope. For AWS, keep
  the selected vertical and platform/account scope explicit. For Azure, keep
  the affected root and subscription/project group explicit.
- External identities need the provider-specific allowlist/catalog step before
  a group or repository assignment. An allowlist alone is not a grant.
- Prefer a plan or provider API lookup over claiming that a change will apply.
  Report unresolved account, subscription, installation, or permission-set
  lookups explicitly.
- Keep credentials, tokens, private keys, passwords, and secret values out of
  files, PR text, logs, and summaries.

## Completion criteria

A request is complete only when the agent can state:

- which provider capability was selected and why;
- which current repository object and desired-state file own the change;
- what the user still needs to provide, if anything;
- which validation was run and its result;
- whether the answer describes declared state, live state, or both;
- the exact PR scope, risk, rollback, and next action.

