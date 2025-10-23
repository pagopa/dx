import { type CatalogEntry } from "@pagopa/dx-mcpprompts";
import React, { useEffect, useState } from "react";

import promptDataPromise from "../data/promptData";
import styles from "./MCPPrompts.module.css";
import PromptCard from "./PromptCard";

export default function MCPPrompts(): JSX.Element {
  const [promptData, setPromptData] = useState<null | {
    promptContents: Record<string, string>;
    prompts: CatalogEntry[];
  }>(null);

  useEffect(() => {
    promptDataPromise.then(setPromptData);
  }, []);

  if (!promptData) {
    return (
      <div className={styles.loadingState}>
        <div>Loading MCP prompts...</div>
      </div>
    );
  }

  const { promptContents, prompts } = promptData;

  return (
    <div className={styles.promptsContainer}>
      <div className={styles.promptsGrid}>
        {prompts.map((prompt) => (
          <PromptCard
            content={promptContents[prompt.id]}
            key={prompt.id}
            prompt={prompt}
          />
        ))}
      </div>
    </div>
  );
}
