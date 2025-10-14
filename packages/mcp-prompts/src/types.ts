/**
 * Represents a complete catalog entry for an MCP (Model Context Protocol) prompt.
 * This is the main structure that defines how prompts are organized and executed.
 */
export interface CatalogEntry {
  /** Category for grouping related prompts (e.g., "terraform", "azure") */
  category: string;
  /** Whether this prompt is active and available for use */
  enabled: boolean;
  /** Unique identifier for the prompt */
  id: string;
  /** Human-readable metadata for documentation and discovery */
  metadata: {
    /** Detailed description of what the prompt does */
    description: string;
    /** Optional usage examples to help users understand the prompt */
    examples?: string[];
    /** Short, user-friendly title */
    title: string;
  };
  /** The actual prompt definition that will be executed */
  prompt: PromptDefinition;
  /** Tags for filtering and categorization */
  tags: string[];
  /** Version string, automatically injected during loading */
  version?: string;
}

/**
 * Defines an input parameter for a prompt.
 * Used to validate and document what arguments a prompt expects.
 */
export interface PromptArgument {
  /** Human-readable description of what this argument is for */
  description: string;
  /** Parameter name that will be used in the args object */
  name: string;
  /** Whether this argument must be provided */
  required: boolean;
}

/**
 * The core prompt definition that contains the executable logic.
 * This follows the MCP specification for prompt structure.
 */
export interface PromptDefinition {
  /** Array of input parameters this prompt accepts */
  arguments: PromptArgument[];
  /** Brief description of the prompt's purpose */
  description: string;
  /**
   * Function that generates the actual prompt content.
   * @param args - Key-value pairs of arguments passed to the prompt
   * @returns Promise resolving to MCP-formatted content with text block
   */
  load: (args: Record<string, unknown>) => Promise<string>;
  /** Unique name identifier for the prompt */
  name: string;
}
