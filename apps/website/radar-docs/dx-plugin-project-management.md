---
title: "DX Plugin: Project Management"
ring: adopt
tags: [ai, copilot, dx, plugin, project-management, jira, github, tool]
---

DX Plugin for Project Management extends Copilot with project management skills
for working with JIRA, GitHub, and adhering to organizational conventions.

## Plugin resources

- [Plugin manifest](https://github.com/pagopa/dx/blob/main/plugins/project-management/plugin.json)
- [MCP server configuration](https://github.com/pagopa/dx/blob/main/plugins/project-management/mcp.json)

## Available skills

- [github-conventions](https://github.com/pagopa/dx/blob/main/plugins/project-management/skills/github-conventions/SKILL.md)
  — Follow GitHub commit and PR conventions

Jira workflows are provided by the
[jira-magister](https://github.com/pagopa/dx/blob/main/plugins/padef/skills/jira-magister/SKILL.md)
skill of the `padef` plugin, which the `backlog-refinement` agent requires.

## Available agents

- [backlog-refinement](https://github.com/pagopa/dx/blob/main/plugins/project-management/com.github.copilot/agents/backlog-refinement.agent.md)
  — AI-assisted backlog refinement and issue breakdown
