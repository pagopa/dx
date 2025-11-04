import { type CatalogEntry } from "@pagopa/dx-mcpprompts";
import React, { useState } from "react";

import styles from "./MCPPrompts.module.css";

interface PromptCardProps {
  prompt: CatalogEntry;
}

export default function PromptCard({ prompt }: PromptCardProps): JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className={styles.promptCard}>
      <div className={styles.promptCardContent}>
        <header className={styles.promptHeader}>
          <div className={styles.promptTitleSection}>
            <h3 className={styles.promptTitle}>{prompt.metadata.title}</h3>
            <div className={styles.promptIdRow}>
              <button
                aria-label="Copy command ID to clipboard"
                className={styles.promptIdContainer}
                onClick={handleCopy}
              >
                <span className={styles.idLabel}>ID:</span>
                <code className={styles.promptId}>{prompt.id}</code>
                <span aria-hidden="true" className={styles.copyIcon}>
                  {copied ? "✓" : "⿻"}
                </span>
              </button>
              <span aria-live="polite" className="sr-only">
                {copied ? "Command ID copied to clipboard" : ""}
              </span>
            </div>
          </div>
        </header>

        <p className={styles.promptDescription}>
          {prompt.metadata.description}
        </p>

        <ul className={styles.promptTags}>
          {prompt.tags.map((tag, index) => (
            <li className={styles.tag} key={index}>
              {tag}
            </li>
          ))}
        </ul>

        <section className={styles.detailsContent}>
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
        </section>
      </div>
    </article>
  );
}
