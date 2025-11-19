import type { Plugin } from "@docusaurus/types";

import { getPrompts } from "@pagopa/dx-mcpprompts";

/**
 * Docusaurus plugin that loads MCP prompts at build time
 * and makes them available to client components via global data
 */
export default async function mcpPromptsLoaderPlugin(): Promise<Plugin> {
  return {
    async contentLoaded({ actions, content }) {
      const { setGlobalData } = actions;
      // Make prompts available to all components
      setGlobalData({ prompts: content });
    },

    async loadContent() {
      // Load prompts at build time (Node.js environment)
      const prompts = await getPrompts();
      return prompts;
    },

    name: "mcp-prompts-loader",
  };
}
