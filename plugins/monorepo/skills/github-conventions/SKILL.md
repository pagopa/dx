---
name: github-conventions
description: Guidelines for pull request titles/descriptions, commit messages, and branch naming conventions. Use when preparing a pull request, committing changes, or creating a new branch to ensure consistency and readability in the repository history.
---

# GitHub Conventions Skill

This skill provides comprehensive guidelines for maintainable and readable repository operations, including commit messages, pull requests, and branching strategies.

## When to Use This Skill

- When requested to **commit changes** or provide a **commit message**
- When requested to **create a pull request** or write a **PR description**
- When asked to **create or name a new branch**

## Pull Request Title and Description

When generating pull request titles and descriptions, follow these guidelines:

### Title

- Keep the subject line concise, ideally under 50 characters; never exceed 72 characters.
- Use descriptive pull request titles that explain the purpose of the change.
- Capitalize the title and use imperative mood (e.g., "Add feature" instead of "Added feature"), matching the same style as commit subject lines.
- **Do not use Conventional Commits prefixes** (`feat:`, `fix:`, `chore:`, `feat(scope):`, etc.). The title starts directly with the capitalized imperative verb.
- Avoid generic titles like "Update code" or "Fix bug"; be specific about the reason for the change.
- Do not include tracking system activity IDs (e.g., Jira task IDs) in the title; reference them in the description instead.

### Description

- Explain the rationale behind the changes, providing a summary of the problem solved or feature added.
- Include relevant context without images or links (use comments for additional details).
- Don’t assume or create issue IDs. Instead, ask if none have been provided.
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
- **Do not use Conventional Commits prefixes** (`feat:`, `fix:`, `chore:`, `feat(scope):`, etc.). The subject line starts directly with the capitalized imperative verb, e.g., "Add JetBrains plugins to devcontainer" not "feat(devcontainer): add JetBrains plugins to devcontainer".

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
- Keep names concise but descriptive, avoiding generic terms like `fix`.
- Do not include tracking system activity IDs (e.g., Jira task IDs) in the branch name; reference them in the PR description instead.

### Examples

- Good: `feats/user-authentication`, `fixes/login-errors`, `refactors/update-react`
- Bad: `CES-666-fix-that`, `fix-bug`, `new-feature`, `update`, `v1.2.0-release`
