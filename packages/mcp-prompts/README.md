# @pagopa/dx-mcpprompts

Centralized catalog of MCP prompts for PagoPA DX tools.

## Installation

```bash
pnpm add @pagopa/dx-mcpprompts
```

## Usage

```typescript
import { promptsCatalog, getEnabledPrompts } from "@pagopa/dx-mcpprompts";

// Get all enabled prompts
const prompts = getEnabledPrompts();

// Access catalog metadata
console.log(promptsCatalog.version);
console.log(promptsCatalog.prompts);
```

## Adding Prompts

Add new entries to the `prompts` array in `src/index.ts`:

```typescript
{
  id: "your-prompt-id",
  version: "1.0.0",
  category: "category-name",
  enabled: true,
  tags: ["tag1", "tag2"],
  metadata: {
    title: "Your Prompt Title",
    description: "Brief description",
    examples: ["Example usage"],
  },
  prompt: {
    name: "your-prompt-id",
    description: "Prompt description",
    arguments: [],
    load: async () => "Your prompt template",
  },
}
```
