import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { ToolDefinition } from "../types.js";

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
    const parsedResult = z.object({ input: z.string() }).safeParse(args);
    if (!parsedResult.success) {
      return "Error: Invalid input";
    }
    return `Tool executed with: ${parsedResult.data.input}`;
  }),
  name: "TestTool",
  parameters: z.object({
    input: z.string().min(1, "Input cannot be empty"),
  }),
};

describe("MCP Server Handlers", () => {
  describe("Tool Handler Validation", () => {
    it("validates tool arguments against the Zod schema", async () => {
      // Arrange
      const validArgs = { input: "test-value" };
      const invalidArgs = { input: "" };

      // Act
      const validResult = mockTool.parameters.safeParse(validArgs);
      const invalidResult = mockTool.parameters.safeParse(invalidArgs);

      // Assert
      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error?.issues[0].message).toContain(
        "cannot be empty",
      );
    });

    it("handles tool execution errors", async () => {
      // Arrange
      const errorTool: ToolDefinition = {
        ...mockTool,
        execute: vi.fn(async () => {
          throw new Error("Tool execution failed");
        }),
      };

      // Act + Assert
      await expect(
        errorTool.execute({ input: "test" }, undefined),
      ).rejects.toThrow("Tool execution failed");
    });

    it("passes context with session data to tool execute", async () => {
      // Arrange
      const context = { session: { id: "session-123" } };

      // Act
      await mockTool.execute({ input: "test" }, context);

      // Assert
      expect(mockTool.execute).toHaveBeenCalledWith({ input: "test" }, context);
    });
  });

  describe("Request Handler Integration", () => {
    it("handles valid tool requests", async () => {
      // Arrange
      const args = { input: "test-input" };

      // Act
      const result = await mockTool.execute(args, undefined);

      // Assert
      expect(result).toContain("Tool executed with: test-input");
      expect(mockTool.execute).toHaveBeenCalledWith(args, undefined);
    });

    it("rejects requests with invalid tool names", () => {
      // Arrange
      const toolRegistry = new Map<string, ToolDefinition>();
      toolRegistry.set("TestTool", mockTool);

      // Act
      const toolExists = toolRegistry.has("NonExistentTool");

      // Assert
      expect(toolExists).toBe(false);
    });

    it("handles tool execution with proper error context", async () => {
      // Arrange
      const toolWithErrorContext: ToolDefinition = {
        ...mockTool,
        execute: vi.fn(async (_args: unknown, context) => {
          if (!context?.session) {
            throw new Error("Session context required");
          }
          return "Success with context";
        }),
      };

      // Act + Assert
      await expect(
        toolWithErrorContext.execute({ input: "test" }, undefined),
      ).rejects.toThrow("Session context required");

      const result = await toolWithErrorContext.execute(
        { input: "test" },
        { session: { id: "session-1" } },
      );
      expect(result).toBe("Success with context");
    });

    it("handles batch tool registration", () => {
      // Arrange
      const toolRegistry = new Map<string, ToolDefinition>();

      // Act
      toolRegistry.set(mockTool.name, mockTool);
      toolRegistry.set("AnotherTool", { ...mockTool, name: "AnotherTool" });

      // Assert
      expect(toolRegistry.size).toBe(2);
    });
  });
});
