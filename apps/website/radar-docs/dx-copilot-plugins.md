---
title: "DX Copilot Plugins"
ring: adopt
tags: [ai, copilot, dx, tool]
---

DX Copilot Plugins extend GitHub Copilot with DX-managed skills, agents, and MCP
servers so teams can work with organization-specific standards, cloud tooling,
project workflows, and infrastructure guidance directly inside the coding flow.

## Use cases

- Grounding Copilot responses on DX documentation and approved standards
- Reusing DX-specific skills and expert agents inside coding sessions
- Connecting Copilot to MCP servers curated by the DX team
- Standardizing AI-assisted workflows for Azure, Terraform, TypeScript, and
  project management

## Plugins in our organization

### Azure

- [Plugin manifest](https://github.com/pagopa/dx/blob/main/plugins/azure/.github/plugin.json)
- [MCP server configuration](https://github.com/pagopa/dx/blob/main/plugins/azure/.mcp.json)
- [Skill documentation: azure-keyvault-secret](https://github.com/pagopa/dx/blob/main/plugins/azure/skills/azure-keyvault-secret/SKILL.md)

### Project Management

- [Plugin manifest](https://github.com/pagopa/dx/blob/main/plugins/project-management/.github/plugin.json)
- [MCP server configuration](https://github.com/pagopa/dx/blob/main/plugins/project-management/.mcp.json)
- [Skill documentation: create-jira-issue](https://github.com/pagopa/dx/blob/main/plugins/project-management/skills/create-jira-issue/SKILL.md)
- [Skill documentation: jira-cli](https://github.com/pagopa/dx/blob/main/plugins/project-management/skills/jira-cli/SKILL.md)
- [Skill documentation: github-conventions](https://github.com/pagopa/dx/blob/main/plugins/project-management/skills/github-conventions/SKILL.md)
- [Agent documentation: backlog-refinement](https://github.com/pagopa/dx/blob/main/plugins/project-management/agents/backlog-refinement.agent.md)

### Standards

- [Plugin source](https://github.com/pagopa/dx/tree/main/plugins/standards)
- [Skill documentation: technology-radar](https://github.com/pagopa/dx/blob/main/plugins/standards/skills/technology-radar/SKILL.md)
- [Radar dataset](https://dx.pagopa.it/radar.json)

### Terraform

- [Plugin manifest](https://github.com/pagopa/dx/blob/main/plugins/terraform/.github/plugin.json)
- [MCP server configuration](https://github.com/pagopa/dx/blob/main/plugins/terraform/.mcp.json)
- [Skill documentation: terraform-best-practices](https://github.com/pagopa/dx/blob/main/plugins/terraform/skills/terraform-best-practices/SKILL.md)
- [Skill documentation: generate-terraform-module-diagram](https://github.com/pagopa/dx/blob/main/plugins/terraform/skills/generate-terraform-module-diagram/SKILL.md)

### TypeScript

- [Plugin manifest](https://github.com/pagopa/dx/blob/main/plugins/typescript/.github/plugin.json)
- [MCP server configuration](https://github.com/pagopa/dx/blob/main/plugins/typescript/.mcp.json)
- [Agent documentation: TypeScript MCP Server Expert](https://github.com/pagopa/dx/blob/main/plugins/typescript/agents/typescript-mcp-expert.agent.md)
