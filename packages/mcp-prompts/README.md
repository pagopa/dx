# @pagopa/dx-mcpprompts

Centralized catalog of MCP prompts for PagoPA DX tools.

## Usage

> **Note**: If you're looking for end-user documentation on how to use these prompts with GitHub Copilot and other AI tools, please visit the [DX documentation page](https://dx.pagopa.it/docs/ai-tooling/prompts-catalog)

The following instructions are for **contributors** who want to programmatically consume or add prompts to the catalog.

## Installation

```bash
pnpm add @pagopa/dx-mcpprompts
```

### Consuming Prompts

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

1. Create a new TypeScript file in `src/prompts/` directory:

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

2. Add the prompt to `src/prompts/index.ts`:

```typescript
import { myNewPrompt } from "./my-new-prompt.js";

export const prompts: CatalogEntry[] = [
  generateTerraformConfiguration,
  myNewPrompt, // Add your new prompt here
];
```
