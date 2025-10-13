export interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

export interface PromptDefinition {
  name: string;
  description: string;
  arguments: PromptArgument[];
  load: (
    args: Record<string, unknown>,
  ) => Promise<{ content: { type: "text"; text: string }[] }>;
}

export interface CatalogEntry {
  id: string;
  version?: string;
  category: string;
  enabled: boolean;
  tags: string[];
  metadata: {
    title: string;
    description: string;
    examples?: string[];
  };
  prompt: PromptDefinition;
}
