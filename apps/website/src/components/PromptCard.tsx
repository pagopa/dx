import React, { useState } from "react";

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
  const [isFlipped, setIsFlipped] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`/${prompt.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className={styles.promptCard}>
      <div
        className={`${styles.flipContainer} ${isFlipped ? styles.flipped : ""}`}
      >
        {/* Front Side - Details */}
        <div className={styles.flipFront}>
          <button
            aria-label="Vedi anteprima"
            className={styles.flipButton}
            onClick={handleFlip}
          >
            <span className={styles.flipButtonIcon}>↪</span>
            <span className={styles.flipButtonText}>Preview</span>
          </button>
          <div className={styles.promptCardContent}>
            <div className={styles.promptHeader}>
              <div className={styles.promptIcon}>{icon}</div>
              <div className={styles.promptTitleSection}>
                <h3 className={styles.promptTitle}>{prompt.metadata.title}</h3>
                <div className={styles.promptIdRow}>
                  <button
                    className={styles.promptIdContainer}
                    onClick={handleCopy}
                    title="Copy command"
                  >
                    <code className={styles.promptId}>/{prompt.id}</code>
                    <span className={styles.copyIcon}>
                      {copied ? "✓" : "⿻"}
                    </span>
                  </button>
                  <span
                    className={`${styles.promptStatusBadge} ${prompt.enabled ? styles.statusEnabled : styles.statusDisabled}`}
                    title={prompt.enabled ? "Enabled" : "Disabled"}
                  >
                    {prompt.enabled ? "✅ Enabled" : "❌ Disabled"}
                  </span>
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
              {prompt.metadata.examples &&
                prompt.metadata.examples.length > 0 && (
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
          </div>
        </div>

        {/* Back Side - Preview */}
        <div className={styles.flipBack}>
          <button
            aria-label="Torna ai dettagli"
            className={styles.flipButton}
            onClick={handleFlip}
          >
            <span className={styles.flipButtonIcon}>↩</span>
            <span className={styles.flipButtonText}>Details</span>
          </button>
          <div
            className={styles.previewContent}
            dangerouslySetInnerHTML={{
              __html: content || "Loading...",
            }}
          />
        </div>
      </div>
    </div>
  );
}
