---
name: create-jira-issue
description: Quickly create or update a Jira issue without breaking flow
argument-hint: "[feature description, bug report, or improvement idea]"
---

# Create Jira Issue

User is mid-development and thought of a bug/feature/improvement. Capture it fast so they can keep working.

**IMPORTANT**: Use the user's natural language, inferred from their first input or the Jira project context.
If you are unsure, ask them which language they prefer.

## Your Goal

Create a complete Jira issue with:

- Clear title
- Summary (detailed description of the issue)
- Definition of done (what needs to be true for this issue to be considered complete)

Set the appropriate priority and type. If it's a sub-task or part of an epic, link it correctly.

## How to Get There

**Ask questions** to fill gaps – be concise, respect the user's time. They're mid-flow and want to capture this quickly. Usually need:

- What't the project key in Jira (e.g., "CES")?
- Does the issue already exist or is this new?
  - What's the issue key if existing
  - What's the new issue draft title if new
- Current behavior vs desired behavior
- Type (bug/feature/improvement) and priority if not obvious

Keep questions brief. One message with 2-3 targeted questions beats multiple back-and-forths.

**Search for context** only when helpful:

- Web search for best practices if it's a complex feature
- Grep codebase to find relevant files
- Note any risks or dependencies you spot

**Skip what's obvious** - If it's a straightforward bug, don't search web. If type/priority is clear from description, don't ask.

**Split if complex** - If the issue is large or too complex, break it into multiple smaller, focused issues. Create each one separately.

**Draft the issue** - Produce a clear, concise issue description with all relevant details. Important: always include a 'Definition of Done' section with checkboxes. 'Definition of Done' section does not contain a checklist of implementation steps. It contains all acceptance criteria that must be met for the issue to be considered complete.

**Create the issue in Jira** - Share the draft with the user for confirmation before creating. Important: always confirm the draft with the user before creating the issue. Use the Atlassian Jira CLI (acli) to create the issue in the correct project with all the details.

NEVER CODE! Just research and write the plan.

## Example Issue Template

```
Title: [Clear, concise title summarizing the issue]
Summary:
- [Detailed description of the issue, current vs desired behavior, any relevant context or steps to reproduce]
Definition of Done:
- [ ] [Acceptance criterion 1]
- [ ] [Acceptance criterion 2]
- [ ] [Acceptance criterion 3]
- [ ] [Acceptance criterion 4]
- [ ] [Acceptance criterion 5]
```
