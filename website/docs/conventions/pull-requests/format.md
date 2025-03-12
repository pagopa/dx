---
sidebar_label: Format
sidebar_position: 1
---

# Format for Pull Requests

This document outlines the required format for pull requests to ensure clarity
and consistency.

Adhering to these guidelines will facilitate smoother reviews and better
communication among team members.

## Title

The title of a pull request should be concise and meaningful, summarizing the
changes made.

Keep the title **within 72 characters** to avoid truncation by GitHub, ensuring
that the full title is visible in notifications and lists, which aids in quick
identification and understanding of the PR's purpose.

Avoid including references to tracking systems (e.g., Jira task IDs) in the
title, as they can clutter it and may not be useful for external reviewers.

## Description

The description of a pull request must explain the rationale behind the
modifications, offering a brief overview of the updates along with any relevant
context. It should include:

- A summary of the problem being solved or the feature being added.
- When applicable: a reference to the tracking system at the end of the
  description using `Resolves #<Jira task ID>` (e.g., `Resolves #DX-1234`).

### Tracking System References

When referencing an activity, such as a Jira task, in a pull request, use one of
[GitHub's supported keywords](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue#linking-a-pull-request-to-an-issue-using-a-keyword)
followed by the task ID. Although these keywords do not automatically link the
pull request to Jira, we follow this convention to maintain consistency rather
than introducing a new one.

**We recommend placing issue references in the description rather than the
title**. This approach allows for multiple issue references within the
description while keeping the title clean and focused.

The reference should be placed on a separate line at the end of the description,
preceded by a blank line for separation. The sentence should begin with an
uppercase letter.

### Dependencies

To express dependencies between different PRs, we use
[dpulls, a GitHub dependency management tool](https://www.dpulls.com/).  
This tool allows you to specify the dependencies between PRs, ensuring that they
are merged in the correct order.  
When creating a PR, you can specify the dependent PRs in the description using
the `Depends on #<PR-number>` syntax.

Add the dependency reference at the end of the description, preceding the
tracking system reference, if present.

### Examples

#### Good Examples

```markdown
<Pull Request description>

Depends on #42 Resolves #DX-001
```

`Depends on #42` indicates that this pull request relies on PR #42 and should
not be merged until that dependency is resolved.  
`Resolves #DX-001` specifies that this pull request addresses issue `DX-001`,
ensuring proper issue tracking.

```markdown
<Pull Request description>

Depends on #42
```

This PR relies on PR #42 but does not resolve any specific issue. The dependency
reference is still included to maintain clarity and ensure proper sequencing.

```markdown
<Pull Request description>
  
Close #DX-002 #CES-50
```

This applies when a single PR resolves multiple tasks tracked by different teams
or boards.

#### Bad Examples

```markdown
<Pull Request description>

<!-- Bad: multiple tasks in the same PR -->

Close #DX-002 #DX-003
```

In this case, you should follow the
[Contribution Acceptance Criteria](acceptance-criteria.md) and split the work
into two separate PRs, each linked to a single task. This ensures better
traceability and avoids merging unrelated changes together.

```markdown
<!-- Bad: verbose reference within the PR description instead of placing it at the end -->

This PR fixes #DX-002...
```

This format is discouraged because the reference is embedded within the
description, making it harder to read and potentially lacking a clear
explanation of the issue being addressed. Instead, provide a meaningful
description and place the reference on a separate line at the end.
