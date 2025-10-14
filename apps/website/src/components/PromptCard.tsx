import React from "react";

import styles from "./MCPPrompts.module.css";

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

interface PromptCardProps {
  content: string;
  icon: string;
  prompt: CatalogEntry;
}

export default function PromptCard({
  content,
  icon,
  prompt,
}: PromptCardProps): JSX.Element {
  return (
    <div className={styles.promptCard}>
      <div className={styles.promptCardContent}>
        <div className={styles.promptHeader}>
          <div className={styles.promptIcon}>{icon}</div>
          <div className={styles.promptTitleSection}>
            <h3 className={styles.promptTitle}>{prompt.metadata.title}</h3>
            <code className={styles.promptId}>{prompt.id}</code>
          </div>
        </div>

        <p className={styles.promptDescription}>
          {prompt.metadata.description}
        </p>

        <div className={styles.promptMeta}>
          <div className={styles.promptCategory}>
            <span>📂</span>
            <span>{prompt.category}</span>
          </div>
          <div
            className={`${styles.promptStatus} ${prompt.enabled ? styles.statusEnabled : styles.statusDisabled}`}
          >
            <span>{prompt.enabled ? "✅" : "❌"}</span>
            <span>{prompt.enabled ? "Enabled" : "Disabled"}</span>
          </div>
        </div>

        <div className={styles.promptTags}>
          {prompt.tags.map((tag, index) => (
            <span className={styles.tag} key={index}>
              {tag}
            </span>
          ))}
        </div>

        {prompt.metadata.examples && prompt.metadata.examples.length > 0 && (
          <div className={styles.promptExamples}>
            <h4 className={styles.examplesTitle}>Examples</h4>
            <ul className={styles.examplesList}>
              {prompt.metadata.examples.map((example, index) => (
                <li className={styles.exampleItem} key={index}>
                  {example}
                </li>
              ))}
            </ul>
          </div>
        )}

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

      <div className={styles.hoverOverlay}>
        <h4 className={styles.overlayTitle}>Prompt Content Preview</h4>
        <div
          className={styles.overlayContent}
          dangerouslySetInnerHTML={{
            __html: content || "Loading...",
          }}
        />
      </div>
    </div>
  );
}
