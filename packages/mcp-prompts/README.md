# @pagopa/dx-mcpprompts

A TypeScript package for managing Markdown-based prompts with YAML frontmatter, designed for AI assistants and the Model Context Protocol (MCP). This package provides a self-contained collection of validated prompts that can be consumed programmatically or served via MCP servers.

## Creating New Prompts

### 1. File Structure

Create a new Markdown file in `src/prompts/` with this structure:

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
    required: true
  - name: "optional_argument"
    description: "Optional argument with default"
    required: false
    default: "default-value"
mode: "agent|assistant|completion"
tools: ["tool1", "tool2"]
---

# Your Prompt Title

Your prompt content goes here using **Markdown formatting**.

You can reference arguments using template variables: {{argument_name}}

## Instructions

1. Be specific and clear in your instructions
2. Use structured format with headings and lists
3. Include examples where helpful
4. Reference tools that should be used: {{tools}}

Expected outcome: {{optional_argument}}
```

### 2. Frontmatter Schema

#### Required Fields

- **`id`**: Unique identifier (kebab-case, no spaces)
- **`title`**: Human-readable title for the prompt
- **`description`**: Brief description of the prompt's purpose
- **`category`**: Main category (`terraform`, `security`, `infrastructure`, `development`)
- **`enabled`**: Boolean flag to enable/disable the prompt

#### Optional Fields

- **`tags`**: Array of tags for filtering and search
- **`examples`**: Array of example use cases or scenarios
- **`arguments`**: Array of input parameters (see Argument Schema below)
- **`mode`**: Execution mode hint (`agent`, `assistant`, `completion`)
- **`tools`**: Array of tools the prompt expects to use

#### Argument Schema

Each argument in the `arguments` array supports:

```yaml
- name: "parameter_name" # Used in {{parameter_name}} substitution
  description: "What this does" # Human-readable description
  required: true # Whether argument is mandatory (default: false)
  default: "fallback_value" # Default value if not provided (optional)
```

### 3. Template Variables

Use double curly braces for variable substitution:

- **Basic**: `{{variable_name}}` - replaced with argument values
- **With defaults**: If argument not provided, uses `default` from frontmatter
- **Fallback**: Missing variables without defaults become empty strings

Example:

```markdown
Hello {{name}}, welcome to {{environment}}!
Version: {{version}}
```

### 4. Validation

All prompts are automatically validated when loaded:

- ✅ **Frontmatter structure** validation using Zod schemas
- ✅ **Required field** presence checking
- ✅ **Type validation** for all fields
- ✅ **Content presence** validation

Invalid prompts are logged and excluded from the catalog, allowing other prompts to continue working.

## Development Workflow

### Adding a New Prompt

1. **Create** `src/prompts/my-new-prompt.md`
2. **Add frontmatter** with required fields
3. **Write content** using template variables
4. **Test locally**:
   ```bash
   cd packages/mcp-prompts
   pnpm test
   pnpm build
   ```

### Best Practices

1. **Use descriptive IDs**: `migrate-terraform-module` not `migrate`
2. **Provide clear descriptions**: Help users understand when to use the prompt
3. **Include examples**: Show typical use cases in the frontmatter
4. **Use appropriate categories**: Helps with organization and filtering
5. **Add default values**: For optional arguments to improve UX
6. **Keep content focused**: One clear purpose per prompt
7. **Use proper Markdown**: Headers, lists, code blocks for clarity

## Package Architecture

- **Location**: `packages/mcp-prompts/src/prompts/`
- **Build**: Prompts are copied to `dist/prompts/` during build
- **Runtime**: Auto-detection of src vs dist for development/production
- **Validation**: Zod schemas ensure type safety and data integrity
- **Logging**: Uses LogTape for structured logging (configure in your app)

## Integration

This package is consumed by:

- **MCP Server** (`apps/mcpserver`): Exposes prompts to AI tools via MCP protocol
- **Documentation Website** (`apps/website`): Displays prompt catalog and examples
