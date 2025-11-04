import type { CatalogEntry } from "@pagopa/dx-mcpprompts";

import { usePluginData } from "@docusaurus/useGlobalData";
import React from "react";

import styles from "./MCPPrompts.module.css";
import PromptCard from "./PromptCard";

interface MCPPromptsPluginData {
  prompts: CatalogEntry[];
}

export default function MCPPrompts(): JSX.Element {
  const { prompts } = usePluginData(
    "mcp-prompts-loader",
  ) as MCPPromptsPluginData;

  if (!prompts || prompts.length === 0) {
    return (
      <section className={styles.loadingState}>
        <p>No MCP prompts available.</p>
      </section>
    );
  }

  return (
    <section className={styles.promptsContainer}>
      <ul className={styles.promptsGrid}>
        {prompts.map((prompt) => (
          <li key={prompt.id}>
            <PromptCard prompt={prompt} />
          </li>
        ))}
      </ul>
    </section>
  );
}
