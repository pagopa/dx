/**
 * Zod schemas for validating Markdown prompt frontmatter and structure.
 */

import { z } from "zod";

/**
 * Schema for prompt argument definitions in frontmatter.
 */
export const PromptArgumentSchema = z
  .object({
    default: z.string().optional(),
    description: z.string().min(1, "Argument description cannot be empty"),
    name: z.string().min(1, "Argument name cannot be empty"),
    required: z.boolean().default(false),
  })
  .refine(
    (data) => {
      // If default is provided, required must be false
      if (data.default !== undefined && data.required === true) {
        return false;
      }
      return true;
    },
    {
      message: "Default value can only be set when required is false",
      path: ["default"],
    },
  );

/**
 * Schema for validating the frontmatter of Markdown prompt files.
 */
export const MarkdownPromptFrontmatterSchema = z.object({
  arguments: z.array(PromptArgumentSchema).default([]),
  category: z.string().min(1, "Category is required and cannot be empty"),
  description: z.string().min(1, "Description is required and cannot be empty"),
  enabled: z.boolean().default(true),
  examples: z.array(z.string()).optional(),
  id: z.string().min(1, "ID is required and cannot be empty"),
  mode: z.enum(["agent", "assistant", "completion"]).optional(),
  model: z.string().optional(),
  tags: z.array(z.string()).default([]),
  title: z.string().min(1, "Title is required and cannot be empty"),
  tools: z.array(z.string()).optional(),
});

/**
 * Schema for the complete parsed Markdown prompt.
 */
export const ParsedMarkdownPromptSchema = z.object({
  content: z.string().min(1, "Prompt content cannot be empty"),
  filepath: z.string(),
  frontmatter: MarkdownPromptFrontmatterSchema,
});

/**
 * Type definitions derived from the schemas.
 */
export type MarkdownPromptFrontmatter = z.infer<
  typeof MarkdownPromptFrontmatterSchema
>;
export type ParsedMarkdownPrompt = z.infer<typeof ParsedMarkdownPromptSchema>;
export type PromptArgument = z.infer<typeof PromptArgumentSchema>;
