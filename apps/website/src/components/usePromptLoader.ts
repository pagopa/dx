/**
 * Type definitions for MCP Prompts
 * These types are shared between the build-time plugin and the components
 */

export interface CatalogEntry {
  category: string;
  enabled: boolean;
  id: string;
  metadata: {
    description: string;
    examples?: string[];
    title: string;
  };
  prompt: {
    arguments: {
      description: string;
      name: string;
      required: boolean;
    }[];
    load: (
      args: Record<string, unknown>,
    ) => Promise<string | { content: { text: string; type: "text" }[] }>;
  };
  tags: string[];
  version?: string;
}
