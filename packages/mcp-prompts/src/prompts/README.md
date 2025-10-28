# MCP Prompts

This directory contains Markdown-based prompts for the PagoPA DX Model Context Protocol (MCP) server.

## 📝 Creating New Prompts

Prompts are written as Markdown files with YAML frontmatter. Here's the structure:

```markdown
---
id: "unique-prompt-id"
title: "Human Readable Title"
description: "Brief description of what this prompt does"
category: "terraform|security|infrastructure|development"
enabled: true
tags: ["tag1", "tag2", "tag3"]
examples:
  - "Example usage scenario 1"
  - "Example usage scenario 2"
arguments:
  - name: "argument_name"
    description: "Description of what this argument does"
    required: false
    default: "default value"
mode: "agent|assistant|completion"
tools: ["tool1", "tool2"]
---

# Prompt Content

Your prompt content goes here. You can use **Markdown formatting**.

You can reference arguments using double curly braces: {{argument_name}}

## Guidelines for Effective Prompts

1. Be specific and clear in your instructions
2. Use structured format with headings and lists
3. Include examples where helpful
4. Specify tools that should be used
5. Explain expected outcomes
```

## 🔧 Frontmatter Fields

### Required Fields

- `id`: Unique identifier for the prompt (kebab-case)
- `title`: Human-readable title
- `description`: Brief description of the prompt's purpose
- `category`: Main category for grouping prompts
- `enabled`: Whether the prompt is active (true/false)

### Optional Fields

- `tags`: Array of tags for filtering and search
- `examples`: Array of example use cases
- `arguments`: Array of input parameters the prompt accepts
- `mode`: Execution mode hint for AI tools
- `tools`: Array of tools the prompt expects to use

### Argument Schema

Each argument in the `arguments` array should have:

- `name`: Parameter name used in template substitution
- `description`: Human-readable description
- `required`: Whether the argument is mandatory (default: false)

## 📁 Current Prompts

- **`generate-terraform-configuration.md`**: Generates Terraform configurations following PagoPA DX best practices
- **`migrate-terraform-module.md`**: Guides migration of Terraform modules between versions
- **`resolve-security-findings.md`**: Analyzes and resolves GitHub CodeQL security findings

## 🔄 Template Variables

Prompts support simple template variable substitution:

- Use `{{variable_name}}` in the content
- Variables are replaced with argument values at runtime
- Missing variables are replaced with empty strings

## ✅ Validation

All prompts are automatically validated using Zod schemas when loaded:

- Frontmatter structure validation
- Required field presence checking
- Type validation for all fields
- Content presence validation

Invalid prompts are logged and excluded from the catalog, allowing other prompts to load normally.

## 📖 Usage

These prompts are automatically loaded by:

- **MCP Server** (`apps/mcpserver`): Exposes prompts to AI tools
- **Documentation Website** (`apps/website`): Displays prompt catalog
- **CLI Tools**: For development and testing

The prompts are consumed programmatically via the `@pagopa/dx-mcpprompts` package.
