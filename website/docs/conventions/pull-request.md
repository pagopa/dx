---
sidebar_label: Pull Request Conventions
sidebar_position: 4
---

# Conventions for Pull Requests

## Context

Pull requests (PRs) are a critical part of the development workflow, enabling collaboration and code review. 

Establishing conventions for PRs ensures clarity and consistency, making it easier for team members to understand and review changes.

## Title

The title of a pull request should be concise and meaningful, summarizing the changes made. 
The title's length should not be longer than 72 characters, because GitHub truncates it.
It should not include any references to tracking systems such as Jira task IDs.

## Description

## Contribution Acceptance Criteria

To ensure that a PR can be approved, the following criteria must be met:

- Code and comments must be written in English
- A PR must contain the **smallest number of changes** possible

[//]: # (- If the pr_enrich workflow assigns the size/large label, a justification for the PR's size must be provided)
- If backward compatibility is broken, an explanation must be included
- The changes must include passing unit tests. The only exception is for tests that expose an existing bug
- The PR must be free of merge conflicts
- The PR should address only **one specific issue** or add **only one feature**. Avoid combining multiple changes; always submit separate PRs for different issues or features
- The CI pipeline must run successfully without errors

## Examples
