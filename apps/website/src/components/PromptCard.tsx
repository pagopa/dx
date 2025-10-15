import React, { useState } from "react";

import styles from "./MCPPrompts.module.css";

interface CatalogEntry {
  category: string;
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

interface PromptCardProps {
  content: string;
  prompt: CatalogEntry;
}

export default function PromptCard({
  content,
  prompt,
}: PromptCardProps): JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.promptCard}>
      <div className={styles.promptCardContent}>
        <div className={styles.promptHeader}>
          <div className={styles.promptTitleSection}>
            <h3 className={styles.promptTitle}>{prompt.metadata.title}</h3>
            <div className={styles.promptIdRow}>
              <button
                className={styles.promptIdContainer}
                onClick={handleCopy}
                title="Click to copy command ID"
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    marginRight: "4px",
                    opacity: 0.7,
                  }}
                >
                  ID:
                </span>
                <code className={styles.promptId}>{prompt.id}</code>
                <span className={styles.copyIcon}>{copied ? "✓" : "⿻"}</span>
              </button>
            </div>
          </div>
        </div>

        <p className={styles.promptDescription}>
          {prompt.metadata.description}
        </p>

        <div className={styles.promptTags}>
          {prompt.tags.map((tag, index) => (
            <span className={styles.tag} key={index}>
              {tag}
            </span>
          ))}
        </div>

        <div className={styles.detailsContent}>
          {prompt.prompt.arguments.length > 0 && (
            <div className={styles.promptArguments}>
              <h4 className={styles.argumentsTitle}>Arguments</h4>
              <ul className={styles.argumentsList}>
                {prompt.prompt.arguments.map((arg, index) => (
                  <li className={styles.argumentItem} key={index}>
                    <span
                      className={`${styles.argumentName} ${arg.required ? styles.argumentRequired : styles.argumentOptional}`}
                    >
                      {arg.name}
                    </span>
                    <span className={styles.argumentDescription}>
                      {arg.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
