import { useEffect, useState } from "react";

interface CatalogEntry {
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

const silentLogger = {
  debug: () => void 0,
  error: () => void 0,
  info: () => void 0,
};

export const usePromptLoader = () => {
  const [prompts, setPrompts] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);
  const [promptContents, setPromptContents] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    loadPromptsData();
  }, []);

  const loadPromptsData = async () => {
    try {
      const { getPrompts, setLogger } = await import("@pagopa/dx-mcpprompts");
      setLogger(silentLogger);
      const allPrompts = await getPrompts();
      setPrompts(allPrompts);
      await loadPromptContents(allPrompts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prompts");
    } finally {
      setLoading(false);
    }
  };

  const loadPromptContents = async (allPrompts: CatalogEntry[]) => {
    const contents: Record<string, string> = {};
    for (const prompt of allPrompts) {
      try {
        const exampleArgs: Record<string, unknown> = {};
        prompt.prompt.arguments.forEach((arg) => {
          exampleArgs[arg.name] = arg.name;
        });
        const result = await prompt.prompt.load(exampleArgs);
        let content =
          typeof result === "string"
            ? result
            : (result as { content: { text: string; type: string }[] })
                ?.content?.[0]?.text || "No content available";

        prompt.prompt.arguments.forEach((arg) => {
          const value = exampleArgs[arg.name] as string;
          if (value && content.includes(value)) {
            content = content.replace(
              new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
              `<span class="argument-highlight">${value}</span>`,
            );
          }
        });
        contents[prompt.id] = content;
      } catch {
        contents[prompt.id] = "Preview not available";
      }
    }
    setPromptContents(contents);
  };

  return { error, loading, promptContents, prompts };
};
