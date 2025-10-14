export interface CatalogEntry {
  category: string;
  enabled: boolean;
  id: string;
  metadata: {
    description: string;
    examples?: string[];
    title: string;
  };
  prompt: PromptDefinition;
  tags: string[];
  version?: string;
}

export interface PromptArgument {
  description: string;
  name: string;
  required: boolean;
}

export interface PromptDefinition {
  arguments: PromptArgument[];
  description: string;
  load: (args: Record<string, unknown>) => Promise<string>;
  name: string;
}
