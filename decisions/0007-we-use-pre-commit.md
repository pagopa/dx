# 6. We use pre-commit for managing git hooks

Date: 2025-01-18

## Status

Accepted

## Context

Pre-commit hooks are scripts that run automatically before each commit to ensure
code quality and standards. While evaluating git hook management solutions, we
compared two main options:

- Husky: NodeJS-focused git hooks manager
- pre-commit: Language-agnostic hook framework

## Decision

We have decided to adopt pre-commit for the following reasons:

1. Language Agnostic: Works across our polyglot development environment
2. Rich Plugin Ecosystem: Access to 500+ maintained hooks
3. Consistent Environment: Hooks run in isolated environments preventing "works
   on my machine" issues
4. Infrastructure as Code Support: Terraform validation through plugins
5. CI/CD Integration: Easy to run in pipelines with pre-commit run --all-files

## Consequences

By adopting pre-commit, we aim to enhance the developer experience, improve
project delivery times, and ensure code quality and consistency across the
organization.

Benefits:

- Standardized code formatting across teams
- Reduced CI pipeline failures
- Earlier detection of issues
- Simplified onboarding with automated checks

Challenges:

- Initial setup required for each repository
- Developers need to install pre-commit tool which is python-based
- May slightly increase initial commit times
