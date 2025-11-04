import { type CatalogEntry, getPrompts } from "@pagopa/dx-mcpprompts";
import React, { useEffect, useState } from "react";

import styles from "./MCPPrompts.module.css";
import PromptCard from "./PromptCard";

export default function MCPPrompts(): JSX.Element {
  const [prompts, setPromptData] = useState<CatalogEntry[] | null>(null);

  useEffect(() => {
    getPrompts().then((data) => {
      setPromptData(data);
    });
  }, []);

  if (!prompts) {
    return (
      <div className={styles.loadingState}>
        <div>Loading MCP prompts...</div>
      </div>
    );
  }

  return (
    <div className={styles.promptsContainer}>
      <div className={styles.promptsGrid}>
        {prompts.map((prompt) => (
          <PromptCard key={prompt.id} prompt={prompt} />
        ))}
      </div>
    </div>
  );
}
