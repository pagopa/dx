## 0.1.3 (2026-11-13)

### 🚀 Features

- Remove the `create-jira-issue` and `jira-cli` skills from the `project-management` plugin: `jira-magister` now owns Jira issue formatting and persistence. The `backlog-refinement` agent delegates to `jira-magister` (from the `padef` plugin) and interacts with Jira only through the Atlassian MCP server, so the Atlassian CLI fallback is no longer supported. ([#2518](https://github.com/pagopa/dx/pull/2518))

### ❤️ Thank You

- Danilo Spinelli @gunzip