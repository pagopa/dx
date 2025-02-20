---
sidebar_label: Principles
sidebar_position: 1
---

# Principles

## Responsibilities of the Pull Request Author
The author of a Pull Request (PR) is responsible for finding the optimal solution and implementing it. The author is responsible for verifying its correct functionality after release.  
Before requesting a review, the author must ensure that:

- The issue has been fully resolved
- The solution is implemented in the most appropriate way
- All required criteria have been met
- No bugs, logical issues, uncovered edge cases, or known vulnerabilities have been left in the code
- The best way to maximize the chances of having a PR approved without excessive iterations is to perform a self-review following the [Contribution Acceptance Criteria](../pull-request/acceptance-criteria.md).


During the self-review, the author should add comments within the PR to explain decisions, trade-offs, or areas where additional context would help the reviewer understand the code.

## Before Requesting a Review
The author is expected to add comments to notify the reviewers of any important details or areas that require additional explanation or attention, such as:

- The addition of a new library
- Potentially insecure code
- Non-obvious assumptions
### What NOT to Do
Do not add `TODO` comments in the source code unless specifically requested by the reviewer. If a `TODO` comment is added due to a pending task, it should include a reference, like:

```
# TODO: To be removed by https://pagopa.atlassian.net/browse/DX-0000  
```
Do not add comments that simply explain what the code does. If a non-TODO comment is added, it should explain why something was done, not what the code does.

Do not request a review for a PR if one or more CI checks are failing.
If the CI fails but a review is still necessary, make sure to leave a comment explaining the reasons.

## Responsibilities of Reviewers
Reviewers are responsible for carefully examining the proposed solution and ensuring that the PR meets all [Contribution Acceptance Criteria](../pull-request/acceptance-criteria.md).

They must also ensure that technical debt is kept under control, carefully evaluating when it makes sense to create follow-up tasks to address any documented debt introduced by the PR.
