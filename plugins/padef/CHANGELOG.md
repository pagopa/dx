## 0.6.1 (2026-11-13)

### 🚀 Features

- Remove the `create-jira-issue` and `jira-cli` skills from the `project-management` plugin: `jira-magister` now owns Jira issue formatting and persistence. The `backlog-refinement` agent delegates to `jira-magister` (from the `padef` plugin) and interacts with Jira only through the Atlassian MCP server, so the Atlassian CLI fallback is no longer supported. ([#2518](https://github.com/pagopa/dx/pull/2518))
- Add a Jira implementation readiness assessment skill. ([#2515](https://github.com/pagopa/dx/pull/2515))
- Structure Jira source documents and acceptance coverage in one readable template; preserve existing descriptions unless an explicit synchronization confirms the change. ([#2516](https://github.com/pagopa/dx/pull/2516))
- Require explicit outputs, slice-local checks and scope for Jira execution items; keep canonical acceptance criteria in their Use Cases and Epic bodies minimal. ([#2521](https://github.com/pagopa/dx/pull/2521))
- Verify all Jira Source URLs during implementation-readiness assessments and report inaccessible or unverifiable documents. Add source-check evaluations backed by a runtime HTTP fixture service. ([#2534](https://github.com/pagopa/dx/pull/2534))
- Add the `create-spec-snapshot` skill: save a Jira issue and the Confluence pages linked from its description to a local, checksummed snapshot, and detect when the snapshot is stale or tampered. ([#2537](https://github.com/pagopa/dx/pull/2537))

### ❤️ Thank You

- Andrea Grillo
- Danilo Spinelli @gunzip
- Luca Cavallaro