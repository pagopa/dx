import React from "react";

import styles from "./MCPPrompts.module.css";
import PromptCard from "./PromptCard";
import { usePromptLoader } from "./usePromptLoader";

export default function MCPPrompts(): JSX.Element {
  const { error, loading, promptContents, prompts } = usePromptLoader();

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div>Loading MCP prompts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>Error loading prompts: {error}</div>
    );
  }

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
