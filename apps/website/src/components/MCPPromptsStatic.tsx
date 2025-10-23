import promptData from "@generated/prompt-loader-plugin/promptData";
import React from "react";

import styles from "./MCPPrompts.module.css";
import PromptCard from "./PromptCard";

export default function MCPPrompts(): JSX.Element {
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
