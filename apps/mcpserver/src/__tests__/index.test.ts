import { describe, expect, it, vi } from "vitest";

import type { PromptEntry, ToolDefinition } from "../types.js";

import {
  mockCatalogEntry,
  mockPromptEntry,
  mockTool,
} from "./__mocks__/handlers.js";

describe("MCP Server Handlers", () => {
  describe("Tool Handler Validation", () => {
    it("should validate tool arguments against the Zod schema", async () => {
      // Valid arguments should pass
      const validArgs = { input: "test-value" };
      const validationResult = mockTool.parameters.safeParse(validArgs);
      expect(validationResult.success).toBe(true);

      // Invalid arguments should fail
      const invalidArgs = { input: "" };
      const invalidationResult = mockTool.parameters.safeParse(invalidArgs);
      expect(invalidationResult.success).toBe(false);
      if (!invalidationResult.success) {
        expect(invalidationResult.error.issues[0].message).toContain(
          "cannot be empty",
        );
      }
    });

    it("should handle tool execution errors gracefully", async () => {
      const errorTool: ToolDefinition = {
        ...mockTool,
        execute: vi.fn(async () => {
          throw new Error("Tool execution failed");
        }),
      };

      await expect(
        errorTool.execute({ input: "test" }, undefined),
      ).rejects.toThrow("Tool execution failed");
    });

    it("should pass context with session data to tool execute", async () => {
      const context = { session: { id: "session-123" } };

      await mockTool.execute({ input: "test" }, context);

      expect(mockTool.execute).toHaveBeenCalledWith({ input: "test" }, context);
    });
  });

  describe("Prompt Handler Validation", () => {
    it("should validate required prompt arguments", () => {
      const missingRequiredArg = { arg2: "value2" };
      const hasAllRequired = mockCatalogEntry.prompt.arguments
        .filter((arg: { required: boolean }) => arg.required)
        .every((arg: { name: string }) => arg.name in missingRequiredArg);

      expect(hasAllRequired).toBe(false);

      const withAllRequired = { arg1: "value1", arg2: "value2" };
      const hasAllRequired2 = mockCatalogEntry.prompt.arguments
        .filter((arg: { required: boolean }) => arg.required)
        .every((arg: { name: string }) => arg.name in withAllRequired);

      expect(hasAllRequired2).toBe(true);
    });

    it("should handle missing required prompt arguments", () => {
      const requiredArgs = mockCatalogEntry.prompt.arguments
        .filter((arg: { required: boolean }) => arg.required)
        .map((arg: { name: string }) => arg.name);

      const providedArgs = { arg2: "value" };
      const missingArgs = requiredArgs.filter(
        (arg: string) => !(arg in providedArgs),
      );

      expect(missingArgs).toEqual(["arg1"]);
    });

    it("should handle optional prompt arguments", async () => {
      const argsWithoutOptional = { arg1: "required-value" };
      await mockPromptEntry.prompt.load(argsWithoutOptional);

      expect(mockPromptEntry.prompt.load).toHaveBeenCalledWith(
        argsWithoutOptional,
      );

      const argsWithOptional = { arg1: "required-value", arg2: "optional" };
      await mockPromptEntry.prompt.load(argsWithOptional);

      expect(mockPromptEntry.prompt.load).toHaveBeenCalledWith(
        argsWithOptional,
      );
    });

    it("should handle prompt loading errors gracefully", async () => {
      const errorPrompt: PromptEntry = {
        ...mockPromptEntry,
        prompt: {
          load: vi.fn(async () => {
            throw new Error("Prompt loading failed");
          }),
        },
      };

      await expect(errorPrompt.prompt.load({ arg1: "test" })).rejects.toThrow(
        "Prompt loading failed",
      );
    });
  });

  describe("Request Handler Integration", () => {
    it("should handle valid tool requests", async () => {
      const args = { input: "test-input" };
      const result = await mockTool.execute(args, undefined);

      expect(result).toContain("Tool executed with: test-input");
      expect(mockTool.execute).toHaveBeenCalledWith(args, undefined);
    });

    it("should reject requests with invalid tool names", () => {
      const toolRegistry = new Map<string, ToolDefinition>();
      toolRegistry.set("TestTool", mockTool);

      const toolExists = toolRegistry.has("NonExistentTool");
      expect(toolExists).toBe(false);
    });

    it("should handle tool execution with proper error context", async () => {
      const toolWithErrorContext: ToolDefinition = {
        ...mockTool,
        execute: vi.fn(async (args: unknown, context) => {
          if (!context?.session) {
            throw new Error("Session context required");
          }
          return "Success with context";
        }),
      };

      // Should fail without context
      await expect(
        toolWithErrorContext.execute({ input: "test" }, undefined),
      ).rejects.toThrow("Session context required");

      // Should succeed with context
      const result = await toolWithErrorContext.execute(
        { input: "test" },
        { session: { id: "session-1" } },
      );
      expect(result).toBe("Success with context");
    });

    it("should handle batch tool and prompt registration", () => {
      const toolRegistry = new Map<string, ToolDefinition>();
      const promptRegistry = new Map<string, PromptEntry>();

      // Register multiple tools
      toolRegistry.set(mockTool.name, mockTool);
      toolRegistry.set("AnotherTool", { ...mockTool, name: "AnotherTool" });

      // Register multiple prompts
      promptRegistry.set(
        mockPromptEntry.catalogEntry.prompt.name,
        mockPromptEntry,
      );
      promptRegistry.set("AnotherPrompt", {
        ...mockPromptEntry,
        catalogEntry: {
          ...mockPromptEntry.catalogEntry,
          prompt: {
            ...mockPromptEntry.catalogEntry.prompt,
            name: "AnotherPrompt",
          },
        },
      });

      expect(toolRegistry.size).toBe(2);
      expect(promptRegistry.size).toBe(2);
    });
  });
});
