---
sidebar_label: Format
sidebar_position: 1
---

# Format for Pull Requests

This document outlines the required format for pull requests to ensure clarity and consistency.  
Adhering to these guidelines will facilitate smoother reviews and better communication among team members.

## Title

The title of a pull request should be concise and meaningful, summarizing the changes made.  
Keep the title within 72 characters to avoid truncation by GitHub.  
Avoid including references to tracking systems (e.g., Jira task IDs) in the title, as they can clutter it and may not be useful for external reviewers.

## Description

The description of a pull request should provide a detailed explanation of the changes made, the reasons for those changes, and any relevant context.  
It should include:

- A summary of the problem being solved or the feature being added
- If applicable, include a reference to the tracking system at the end of the description using `Resolves #<Jira task ID>` (e.g., `Resolves #DX-1234`)

### Tracking System References

When referencing an activity, such as a Jira task, in a pull request, use one of [GitHub's supported keywords](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue#linking-a-pull-request-to-an-issue-using-a-keyword) followed by the task ID.
This ensures that the pull request is automatically linked to the relevant issue.
We enforce the use of `Resolves #<issue-number>` in the description rather than the title. This approach allows for multiple issue references within the description while keeping the title clean and focused.  
The reference should be placed on a separate line at the end of the description, preceded by a blank line for separation. The sentence should begin with an uppercase letter.

Here are some examples:

- ```markdown
  <Pull Request description>
  
  Resolves #DX-001
  ```
- ```markdown
  <Pull Request description>
  
  Close #DX-002 #DEV-003
  ```
  This is the case when the pull request is related to multiple issues on different boards.

