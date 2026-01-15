import { vi } from "vitest";
import { z } from "zod";

import type { CatalogEntry, PromptEntry, ToolDefinition } from "../types.js";

export const mockTool: ToolDefinition = {
  description: "A test tool",
  execute: vi.fn(async (args: unknown) => {
    const parsed = z.object({ input: z.string() }).parse(args);
    return `Tool executed with: ${parsed.input}`;
  }),
  name: "TestTool",
  parameters: z.object({
    input: z.string().min(1, "Input cannot be empty"),
  }),
};

export const mockCatalogEntry: CatalogEntry = {
  id: "test-prompt",
  prompt: {
    arguments: [
      { description: "First argument", name: "arg1", required: true },
      { description: "Second argument", name: "arg2", required: false },
    ],
    description: "A test prompt",
    name: "TestPrompt",
  },
};

export const mockPromptEntry: PromptEntry = {
  catalogEntry: mockCatalogEntry,
  prompt: {
    load: vi.fn(
      async (args: Record<string, unknown>) =>
        `Prompt loaded with args: ${JSON.stringify(args)}`,
    ),
  },
};
