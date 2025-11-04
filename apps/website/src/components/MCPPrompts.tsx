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
      <section className={styles.loadingState}>
        <p>Loading MCP prompts...</p>
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
