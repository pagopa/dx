import { type CatalogEntry, getPrompts } from "@pagopa/dx-mcpprompts";

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
        typeof result === "string" ? result : "No content available";

      prompt.prompt.arguments.forEach((arg) => {
        const value = exampleArgs[arg.name] as string;
        if (value && content.includes(value)) {
          content = content.replace(
            // Escape special regex characters in the value to use it safely in RegExp
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

// Pre-load prompt data at module level
const promptDataPromise = (async () => {
  const prompts = await getPrompts();
  const promptContents = await loadPromptContents(prompts);
  return { promptContents, prompts };
})();

export default promptDataPromise;
