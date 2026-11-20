# Issue tracker: Jira (project CES)

Issues and specs for this repo live in Jira, project key **CES**. Use the **Atlassian MCP
server** tools for every operation. Do not use `gh issue` (GitHub Issues are not used by this
repo's engineering workflow) and do not fall back to `acli`.

## Resolve the cloud ID first

Every Jira tool call needs a `cloudId`. Get it once per session with
`getAccessibleAtlassianResources`, then reuse it. Never hardcode or guess it.

## Conventions

- New issues go to project key **CES**: `createJiraIssue` with `cloudId`, `projectKey: "CES"`,
  `summary`, and `description` in Markdown — the MCP server converts it to ADF. If the calling
  skill doesn't imply a type, ask: `Bug` for a defect, `Task` otherwise.
- `searchJiraIssuesUsingJql` must constrain the project, e.g.
  `project = CES AND statusCategory != Done ORDER BY created DESC`. Request only the fields you
  need.
- Jira labels are a flat string list: add and remove by rewriting the list with `editJiraIssue`.
- Read an issue before `transitionJiraIssue` to get the available transitions; never assume a
  transition id.
- Closing means transitioning to the project's done-category status, with a closing comment
  first.

Issue keys look like `CES-123`. A bare `#123` from another tool is not a Jira key — resolve it
with the caller before acting.

## Pull requests

**PRs as a request surface: no.** GitHub PRs are code review, not a triage queue.

## When a skill says "publish to the issue tracker"

Create a Jira issue in project CES.

## When a skill says "fetch the relevant ticket"

`getJiraIssue` for that key, plus `listJiraIssueComments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is one Jira issue labelled `wayfinder:map`; **tickets** are
its child issues.

- **Map**: a CES issue labelled `wayfinder:map` with the Notes / Decisions-so-far / Fog body.
- **Child ticket**: a Jira sub-task of the map where the project allows it, otherwise a CES
  issue linked to the map with a `Relates to` link and `Part of <MAP-KEY>` at the top of the
  description. Label with `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Claim
  by assigning to the driving dev.
- **Blocking**: Jira issue links, the UI-visible representation. Add the `Blocks` link on the
  blocker and set the inverse `is blocked by` on the child. A ticket is unblocked when every
  blocker is in a done-category status.
- **Frontier query**: open children of the map, minus any with an open `is blocked by`
  blocker or an assignee; first in map order wins.
- **Claim**: assign to the driving dev — the session's first write.
- **Resolve**: comment the answer, transition the child to done, then append a context
  pointer (summary + link) to the map's Decisions-so-far.
