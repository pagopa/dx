---
sidebar_label: Branch Name
sidebar_position: 1
---

# Branch Naming Conventions

To maintain consistency and clarity in our Git workflow, branch names should follow the format `<activity-type>/<activity-name>`. The activity name should be **short, meaningful, and in plural form where applicable**, similar to how you would name a folder containing multiple related files.

## Guidelines

- **Keep branch names clean and focused**: do not include tracking system activity IDs (e.g., Jira task IDs) in the branch name. Instead, [reference them in the PR description](../pull-request/format.md#description)
- **Use lowercase and hyphens (`-`)** to separate words for readability
- **Keep names concise but descriptive**, avoiding overly generic terms like `update` or `fix`

## Activity Types

Use one of the following types to categorize the branch activity:

- `features/`:  for new features
- `bugfixes/`:  or bug fixes
- `hotfixes/`: for urgent production fixes
- `refactors/`: for code refactoring and reducing technical debt

## Examples

### Good Examples

- `features/user-authentication`
- `bugfixes/login-errors`
- `hotfixes/error-503-on-payment-checkout`
- `refactors/update-react-in-ui-components-workspace`

### Examples

- `fix-bug` _(too vague)_
- `new-feature` _(uncategorized)_
- `update` _(lacks clarity)_
- `v1.2.0-release` _(versioning should be handled via tags)_
- `ui-redesign` _(should be `refactors/ui-redesign`)_
