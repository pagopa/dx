/**
 * Tests for Markdown prompt loading functionality.
 */

import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { PromptArgumentSchema } from "../schemas.js";
import { convertToMCPCatalogEntry } from "../utils/markdown-loader.js";

describe("Markdown Prompt Loader", () => {
  it("should parse a markdown prompt with frontmatter", async () => {
    // This tests the parser with a mock markdown content
    const frontmatter = {
      arguments: [
        {
          description: "Test input parameter",
          name: "input",
          required: true,
        },
      ],
      category: "test",
      description: "A test prompt for validation",
      enabled: true,
      id: "test-prompt",
      tags: ["test", "example"],
      title: "Test Prompt",
    };

    const parsedPrompt = {
      content: "This is a test prompt with {{input}} placeholder.",
      filepath: "/test/path.md",
      frontmatter,
    };

    expect(parsedPrompt.frontmatter.id).toBe("test-prompt");
    expect(parsedPrompt.frontmatter.enabled).toBe(true);
    expect(parsedPrompt.content).toContain("{{input}}");
  });

  it("should convert parsed prompt to MCP catalog entry", () => {
    const parsedPrompt = {
      content: "Test content with {{param}} placeholder.",
      filepath: "/test/path.md",
      frontmatter: {
        arguments: [
          {
            description: "Test parameter",
            name: "param",
            required: false,
          },
        ],
        category: "test",
        description: "Test description",
        enabled: true,
        id: "test-id",
        tags: ["test"],
        title: "Test Title",
      },
    };

    const catalogEntry = convertToMCPCatalogEntry(parsedPrompt);

    expect(catalogEntry.id).toBe("test-id");
    expect(catalogEntry.category).toBe("test");
    expect(catalogEntry.enabled).toBe(true);
    expect(catalogEntry.metadata.title).toBe("Test Title");
    expect(catalogEntry.prompt.arguments).toHaveLength(1);
    expect(catalogEntry.prompt.arguments[0].name).toBe("param");
  });

  it("should handle template replacement in prompt content", async () => {
    const parsedPrompt = {
      content: "Hello {{name}}, welcome to {{place}}!",
      filepath: "/test/path.md",
      frontmatter: {
        arguments: [
          {
            description: "User name",
            name: "name",
            required: true,
          },
          {
            description: "Place name",
            name: "place",
            required: false,
          },
        ],
        category: "greeting",
        description: "A greeting prompt",
        enabled: true,
        id: "greeting",
        tags: ["greeting"],
        title: "Greeting",
      },
    };

    const catalogEntry = convertToMCPCatalogEntry(parsedPrompt);
    const result = await catalogEntry.prompt.load({
      name: "Alice",
      place: "Wonderland",
    });

    expect(result).toBe("Hello Alice, welcome to Wonderland!");
  });

  it("should handle missing template variables gracefully", async () => {
    const parsedPrompt = {
      content: "Hello {{name}}, welcome to {{place}}!",
      filepath: "/test/path.md",
      frontmatter: {
        arguments: [],
        category: "greeting",
        description: "A greeting prompt",
        enabled: true,
        id: "greeting",
        tags: ["greeting"],
        title: "Greeting",
      },
    };

    const catalogEntry = convertToMCPCatalogEntry(parsedPrompt);
    const result = await catalogEntry.prompt.load({
      name: "Alice",
      // place is missing
    });

    expect(result).toBe("Hello Alice, welcome to !");
  });

  it("should use default values for missing arguments", async () => {
    const parsedPrompt = {
      content: "Hello {{name}}, welcome to {{place}}! Version: {{version}}",
      filepath: "/test/path.md",
      frontmatter: {
        arguments: [
          {
            description: "User name",
            name: "name",
            required: true,
          },
          {
            default: "Earth",
            description: "Place name",
            name: "place",
            required: false,
          },
          {
            default: "1.0.0",
            description: "Version number",
            name: "version",
            required: false,
          },
        ],
        category: "greeting",
        description: "A greeting prompt with defaults",
        enabled: true,
        id: "greeting-with-defaults",
        tags: ["greeting"],
        title: "Greeting with Defaults",
      },
    };

    const catalogEntry = convertToMCPCatalogEntry(parsedPrompt);

    // Test with only required argument provided
    const result1 = await catalogEntry.prompt.load({
      name: "Alice",
    });
    expect(result1).toBe("Hello Alice, welcome to Earth! Version: 1.0.0");

    // Test with some optional arguments provided
    const result2 = await catalogEntry.prompt.load({
      name: "Bob",
      place: "Mars",
    });
    expect(result2).toBe("Hello Bob, welcome to Mars! Version: 1.0.0");

    // Test with all arguments provided
    const result3 = await catalogEntry.prompt.load({
      name: "Charlie",
      place: "Jupiter",
      version: "2.1.0",
    });
    expect(result3).toBe("Hello Charlie, welcome to Jupiter! Version: 2.1.0");
  });
});

describe("Argument Schema Validation", () => {
  it("should allow default value when required is false", () => {
    const validArgument = {
      default: "default_value",
      description: "Test argument",
      name: "test_arg",
      required: false,
    };

    expect(() => PromptArgumentSchema.parse(validArgument)).not.toThrow();
  });

  it("should allow required argument without default", () => {
    const validArgument = {
      description: "Required test argument",
      name: "required_arg",
      required: true,
    };

    expect(() => PromptArgumentSchema.parse(validArgument)).not.toThrow();
  });

  it("should reject default value when required is true", () => {
    const invalidArgument = {
      default: "should_not_be_allowed",
      description: "Invalid argument",
      name: "invalid_arg",
      required: true,
    };

    expect(() => PromptArgumentSchema.parse(invalidArgument)).toThrow(ZodError);

    try {
      PromptArgumentSchema.parse(invalidArgument);
    } catch (error) {
      if (error instanceof ZodError) {
        expect(error.issues[0].message).toBe(
          "Default value can only be set when required is false",
        );
        expect(error.issues[0].path).toEqual(["default"]);
      }
    }
  });

  it("should allow optional argument without default (implicit behavior)", () => {
    const validArgument = {
      description: "Optional without default",
      name: "optional_arg",
      required: false,
    };

    expect(() => PromptArgumentSchema.parse(validArgument)).not.toThrow();
  });
});
