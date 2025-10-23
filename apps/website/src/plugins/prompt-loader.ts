import type { LoadContext, Plugin } from "@docusaurus/types";

import { type CatalogEntry, getPrompts } from "@pagopa/dx-mcpprompts";
import * as fs from "fs";
import * as path from "path";

interface PromptData {
  promptContents: Record<string, string>;
  prompts: CatalogEntry[];
}

export default function promptLoaderPlugin(context: LoadContext): Plugin<void> {
  return {
    loadContent: async (): Promise<void> => {
      try {
        // Load all prompts
        const allPrompts = await getPrompts();

        // Load prompt contents
        const promptContents = await loadPromptContents(allPrompts);

        // Create prompt data object
        const promptData: PromptData = {
          promptContents,
          prompts: allPrompts,
        };

        // Ensure the generated directory exists
        const generatedDir = path.join(
          context.generatedFilesDir,
          "prompt-loader-plugin",
        );
        fs.mkdirSync(generatedDir, { recursive: true });

        // Write the data to a file that can be imported
        const dataFilePath = path.join(generatedDir, "promptData.json");
        fs.writeFileSync(dataFilePath, JSON.stringify(promptData, null, 2));

        // Also create a TypeScript module for easier importing
        const moduleFilePath = path.join(generatedDir, "promptData.ts");
        fs.writeFileSync(
          moduleFilePath,
          `// Auto-generated file - do not edit manually
import type { CatalogEntry } from '@pagopa/dx-mcpprompts';

export interface PromptData {
  promptContents: Record<string, string>;
  prompts: CatalogEntry[];
}

const promptData: PromptData = ${JSON.stringify(promptData, null, 2)};

export default promptData;
`,
        );

        console.log(`Generated prompt data with ${allPrompts.length} prompts`);
      } catch (error) {
        console.error("Failed to generate prompt data:", error);
        throw error;
      }
    },
    name: "prompt-loader-plugin",
  };
}

async function loadPromptContents(
  allPrompts: CatalogEntry[],
): Promise<Record<string, string>> {
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
  return contents;
}
