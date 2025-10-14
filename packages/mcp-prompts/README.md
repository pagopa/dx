# @pagopa/dx-mcpprompts

Centralized catalog of MCP prompts for PagoPA DX tools.

## Installation

```bash
pnpm add @pagopa/dx-mcpprompts
```

## Usage

```typescript
import {
  getEnabledPrompts,
  getPromptById,
  getPromptsByCategory,
} from "@pagopa/dx-mcpprompts";

// Get all enabled prompts
const prompts = await getEnabledPrompts();

// Get specific prompt by ID
const prompt = await getPromptById("generate-terraform-configuration");

// Get prompts by category
const terraformPrompts = await getPromptsByCategory("terraform");
```

## Adding Prompts

Create a new TypeScript file in `src/prompts/` directory. The loader automatically discovers and imports all prompt files:

```typescript
// src/prompts/my-new-prompt.ts
import type { CatalogEntry } from "../types.js";

export const myNewPrompt: CatalogEntry = {
  id: "my-new-prompt",
  category: "category-name",
  enabled: true,
  tags: ["tag1", "tag2"],
  metadata: {
    title: "My New Prompt",
    description: "Brief description of what this prompt does",
    examples: ["Example usage 1", "Example usage 2"],
  },
  prompt: {
    name: "my-new-prompt",
    description: "Prompt description",
    arguments: [
      {
        name: "input",
        description: "Input parameter description",
        required: false,
      },
    ],
    load: async (args: { input?: string }) => ({
      content: [
        {
          type: "text" as const,
          text: `Your prompt content here: ${args.input || "default"}`,
        },
      ],
    }),
  },
};
```

### Key Points:

- **File-based discovery**: Each prompt is a separate file in `src/prompts/`
- **Automatic loading**: The loader scans for exported objects that conform to the `CatalogEntry` interface
- **Version injection**: Package version is automatically added to each prompt
- **MCP format**: The `load` function must return MCP-compatible content structure
