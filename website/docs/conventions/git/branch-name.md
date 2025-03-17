---
sidebar_label: Branch Name
sidebar_position: 1
---

# Branch Naming Conventions

To maintain consistency and clarity in your team's Git workflow, you may want to
follow the format `<activity-type>/<activity-name>` to name a branch. The
activity name should be **short, meaningful, and in plural form where
applicable**, similar to how you would name a folder containing multiple related
files.

## Guidelines

- **Keep branch names clean and focused**: do not include tracking system
  activity IDs (e.g., Jira task IDs) in the branch name. Instead,
  [reference them in the PR description](../pull-requests/format.md#description).
- **Use lowercase and hyphens (`-`)** to separate words for readability.
- **Keep names concise but descriptive**, avoiding overly generic terms like
  `update` or `fix`.

## Activity Types

Use one of the following types to categorize the branch activity:

- `feats`: for new features
- `fixes`: for any fix
- `refactors`: for code refactoring and reducing technical debt
- `chores`: for system tasks that are not user-facing
- `docs`: for documentation-related tasks

This categorization helps quickly identify the purpose of the branch and
provides context to the team. Additionally, it allows us to gain **insights into
the effort invested in different types of activities** and how they are
integrated into the development process.

## Examples

### Good Examples

- `feats/user-authentication`
- `fixes/login-errors`
- `refactors/update-react-in-ui-components-workspace`

### Bad Examples

- `CES-666-fix-that` _(includes superfluous details)_
- `fix-bug` _(too vague)_
- `new-feature` _(uncategorized)_
- `update` _(lacks scope)_
- `v1.2.0-release` _(versioning should be handled via tags)_
- `ui-redesign` _(should be `refactors/ui-design`)_
- `feats/authentication_page` _(should use use hyphens instead of underscores)_
