---
description: This file describes general instructions for the project that apply to all file types.
applyTo: "**"
---

# General Instructions for Code Generation

Never commit code or open pull requests without being asked to do so.

## Pull Request Title and Description

When generating pull request titles and descriptions, follow these guidelines:

### Title

- Keep the subject line concise, ideally under 50 characters; never exceed 72 characters.
- Use descriptive pull request titles that explain the purpose of the change.
- Avoid generic titles like "Update code" or "Fix bug"; be specific about the reason for the change.
- Do not include tracking system activity IDs (e.g., Jira task IDs) in the title; reference them in the description instead.

### Description

- Explain the rationale behind the changes, providing a summary of the problem solved or feature added.
- Include relevant context without images or links (use comments for additional details).
- Reference tracking system issues at the end using keywords like "Resolves DX-1234" or "Depends on #42".
- Place references on a separate line, preceded by a blank line, starting with an uppercase letter.

## Copilot Guidelines for Commit Messages

When generating commit messages, follow these guidelines:

- Keep the subject line concise, ideally under 50 characters; never exceed 72 characters.
- Capitalize the subject line and do not end it with a period.
- Use the imperative mood (e.g., "Add feature" instead of "Added feature").
- Explain the rationale behind the changes in the body, not the implementation details.
- If additional context is needed, add a blank line after the subject and provide details in the body.
- Avoid generic messages; be specific about the reason for the change (e.g., avoid "Refactor code" and prefer "Refactor authentication logic to improve security").

## Branch Naming Conventions

Follow the format `<activity-type>/<activity-name>` for branch names to maintain consistency and clarity.

### Activity Types

- `feats`: for new features
- `fixes`: for any fix
- `refactors`: for code refactoring and reducing technical debt
- `chores`: for system tasks that are not user-facing
- `docs`: for documentation-related tasks

### Guidelines

- Use lowercase and hyphens (`-`) to separate words.
- Keep names concise but descriptive, avoiding generic terms like `update` or `fix`.
- Do not include tracking system activity IDs (e.g., Jira task IDs) in the branch name; reference them in the PR description instead.

### Examples

- Good: `feats/user-authentication`, `fixes/login-errors`, `refactors/update-react-in-ui-components-workspace`
- Bad: `CES-666-fix-that`, `fix-bug`, `new-feature`, `update`, `v1.2.0-release`
