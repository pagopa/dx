---
sidebar_label: Principles
sidebar_position: 1
---

# Principles

## Responsibilities of the Pull Request Author

The author of a Pull Request (PR) is responsible for finding the optimal solution and implementing it. The author is responsible for verifying its correct functionality before and after release.  
Before requesting a review, the author must ensure that:

- the issue has been fully resolved
- no bugs, logical issues, uncovered edge cases, or known vulnerabilities have been left in the code
- the best way to maximize the chances of having a PR approved without excessive iterations is to perform a self-review following the [Contribution Acceptance Criteria](../pull-request/acceptance-criteria.md)

During the self-review, the author should add comments within the PR to explain decisions, trade-offs, or areas where additional context would help the reviewer understand the code.

## Before Requesting a Review

The author is expected to add comments to notify the reviewers of any important details or areas that require additional explanation or attention, such as:

- the addition of a new library
- potentially insecure code
- non-obvious assumptions

### What NOT to do within a PR

Do not add `TODO` comments in the source code unless specifically requested by the reviewer. If a `TODO` comment is added due to a pending task, it must include a reference to the corresponding task in the backlog, like:

```
# TODO: To be removed by https://pagopa.atlassian.net/browse/DX-0000  
```
Do not add comments that simply explain what the code does. If a non-TODO comment is added, it should explain _why_ something was done, not _what_ the code does.

Do not request a review for a PR if one or more CI checks are failing.
If the CI fails but a review is still necessary, make sure to leave a comment explaining the reasons.

## Responsibilities of PR Reviewers

Reviewers are responsible for carefully examining the proposed solution and ensuring that the PR meets all [Contribution Acceptance Criteria](../pull-request/acceptance-criteria.md).

They must also ensure that technical debt is kept under control, carefully evaluating when it makes sense to create follow-up tasks to address any documented debt introduced by the PR.

# Best Practices

## Everyone

- Be kind
- Accept that many programming decisions are opinions; discuss tradeoffs and reach a resolution quickly
- Ask questions, avoid making demands (e.g. “What do you think about naming this method `fetchHome` instead `getHome`?”)
- Ask for clarification (e.g. “I didn’t understand why this `if` statement is required. Can you clarify?")
- Be explicit: remember people don’t always understand your intentions online
- Be humble
- Consider one-on-one chats or video calls if there are too many “I didn’t understand” or “Alternative solution:” comments. Post a follow-up comment summarizing one-on-one discussion
- If you ask a question to a specific person, always start the comment by mentioning them; this ensures they see it if their notification level is set to “mentioned” and other people understand they don’t have to respond

## PR Author

Keep in mind that code review is a process that can take multiple iterations, and reviewers may spot things later that they may not have seen the first time.

- The first reviewer of your code is you. Before requesting the review, read through the entire `diff`. Does it make sense? Did you include something unrelated to the overall purpose of the changes?
- Follow the guidelines to compile PR's title and description
- Don’t take it personally. The review is of the code, not of you
- Extract unrelated changes and refactorings into future PRs
- Seek to understand the reviewer’s perspective
- Try to respond to every comment
- The PR author can only resolve threads that have been fully addressed. If a comment remains open, it must be left for the comment author to resolve
- Don't assume that _all_ feedback requires to be incorporated. Consider to address non mandatory suggestions with a follow up, after the PR is merged
- Once ready for the next round, request feedback from the reviewer. Follow the [suggestion about requesting a new review from the GitHub guide](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/requesting-a-pull-request-review#requesting-reviews-from-collaborators-and-organization-members)

## PR Reviewer

- Be as clear as possible to minimize unnecessary review iterations
- Communicate which ideas you feel strongly about and those you don’t; you may use the [conventional comments](conventional-comments.md)
- Identify ways to simplify the code while still solving the problem
- Offer alternative implementations, but assume the author already considered them (“What do you think about using a custom validator here?”)
- Seek to understand the author’s perspective
- Check out the branch, and test the changes locally. Your testing might result in opportunities to add automated tests
- If a piece of code is unclear, say so! There’s a good chance someone else would be confused by it as well
- Ensure the author understands what is required to resolve a comment
- Summarize review feedback with a final note (e.g., “LGTM”, or “I left some suggestions, let me know what you think.”)

## Credits

Based on [GitLab guidelines](https://docs.gitlab.com/development/code_review/#getting-your-merge-request-reviewed-approved-and-merged).
