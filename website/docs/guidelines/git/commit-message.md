---
sidebar_label: Commit Message
sidebar_position: 2
---

# Commit Message Guidelines

Writing clear and well-structured commit messages improves collaboration, makes
code history more readable, and helps with debugging. This guide provides best
practices for writing effective commit messages.

## General Guidelines

- **Keep it concise**: keep the subject line concise, ideally under **50
  characters**. If necessary, do not exceed **72** characters to maintain
  readability. This follows the
  [Git commit best practices](https://git-scm.com/docs/git-commit#_discussion)
- **PR title consideration**: when opening a pull request with a single commit,
  the commit message will be used as the PR title—so make it meaningful
- **Add details when needed**: if additional context is required, add a blank
  line after the subject and provide a more detailed explanation in the body
- **Capitalize the subject line**, as you would in a sentence
- **Do not end the subject line with a period** (`.`) to keep it clean
- **Use the imperative mood**: write messages as if completing the sentence:
  _"If applied, this commit will `<subject>`"_
- **Explain the rationale behind the changes in the body**: instead of detailing
  _how_ the change was made (which is visible in the code), focus on _why_ it is
  necessary

## Conventional Commits

[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#summary)
is a specification for adding human and machine-readable meaning to commit
messages.  
It is used to generate changelogs and automate versioning.

Since
[we use Changesets to handle versioning and changelogs](../pull-request/changeset.md),
we do not require Conventional Commits. Instead, we focus on clear, structured
messages that enhance readability.
