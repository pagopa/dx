import React from "react";

import styles from "./MCPPrompts.module.css";
import PromptCard from "./PromptCard";
import { usePromptLoader } from "./usePromptLoader";

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
  };
  tags: string[];
  version?: string;
}

const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    aws: "🟠",
    azure: "☁️",
    default: "📝",
    development: "💻",
    docker: "🐳",
    kubernetes: "⚙️",
    operations: "🔧",
    terraform: "🏗️",
  };
  return icons[category.toLowerCase()] || icons.default;
};

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

  const promptsByCategory = prompts.reduce(
    (acc, prompt) => {
      if (!acc[prompt.category]) {
        acc[prompt.category] = [];
      }
      acc[prompt.category].push(prompt);
      return acc;
    },
    {} as Record<string, CatalogEntry[]>,
  );

  return (
    <div className={styles.promptsContainer}>
      {Object.entries(promptsByCategory).map(([category, categoryPrompts]) => (
        <div className={styles.categorySection} key={category}>
          <div className={styles.categoryHeader}>
            <h2 className={styles.categoryTitle}>
              {getCategoryIcon(category)}{" "}
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </h2>
            <span className={styles.categoryCount}>
              {categoryPrompts.length} prompts
            </span>
          </div>
          <div className={styles.promptsGrid}>
            {categoryPrompts.map((prompt) => (
              <PromptCard
                content={promptContents[prompt.id]}
                icon={getCategoryIcon(prompt.category)}
                key={prompt.id}
                prompt={prompt}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
