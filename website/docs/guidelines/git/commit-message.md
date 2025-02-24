---
sidebar_label: Commit Message
sidebar_position: 2
---

# Commit Message Guidelines

Writing clear and well-structured commit messages improves collaboration, makes code history more readable, and helps with debugging. This guide provides best practices for writing effective commit messages.

## General Guidelines

- **Keep it concise**: summarize the change with a short message, ideally no more than **50 characters**. If more characters are needed, do not exceed **72**. This follows the [Git commit best practices](https://www.kernel.org/pub/software/scm/git/docs/git-commit.html#_discussion)
- **PR title consideration**: when opening a pull request with a single commit, the commit message will be used as the PR title—so make it meaningful
- **Add details when needed**: if additional context is required, add a blank line after the subject and provide a more detailed explanation in the body
- **Capitalize the subject line**, as you would in a sentence
- **Do not end the subject line with a period** (`.`) to keep it clean
- **Use the imperative mood**: write messages as if completing the sentence: _"If applied, this commit will `<subject>`"_
- **Explain the "why" in the body**: instead of detailing _how_ the change was made (which is visible in the code), focus on _why_ it was necessary
