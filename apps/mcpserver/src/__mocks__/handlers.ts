import { vi } from "vitest";
import { z } from "zod";

import type { CatalogEntry, PromptEntry, ToolDefinition } from "../types.js";

export const mockTool: ToolDefinition = {
  annotations: {
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    title: "Test Tool",
  },
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
  category: "test",
  enabled: true,
  id: "test-prompt",
  metadata: {
    description: "A test prompt for unit testing",
    title: "Test Prompt",
  },
  prompt: {
    arguments: [
      { description: "First argument", name: "arg1", required: true },
      { description: "Second argument", name: "arg2", required: false },
    ],
    description: "A test prompt",
    load: async (args: Record<string, unknown>) =>
      `Prompt loaded with args: ${JSON.stringify(args)}`,
    name: "TestPrompt",
  },
  tags: ["test"],
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
