---
"padef": minor
"project-management": minor
---

Remove the `create-jira-issue` and `jira-cli` skills from the `project-management` plugin: `jira-magister` now owns Jira issue formatting and persistence. The `backlog-refinement` agent delegates to `jira-magister` (from the `padef` plugin) and interacts with Jira only through the Atlassian MCP server, so the Atlassian CLI fallback is no longer supported.
