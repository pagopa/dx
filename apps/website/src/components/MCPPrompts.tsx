import React, { useEffect, useState } from "react";

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
    load: (
      args: Record<string, unknown>,
    ) => Promise<string | { content: { text: string; type: "text" }[] }>;
  };
  tags: string[];
  version?: string;
}

// Silent logger for browser environment
const silentLogger = {
  debug: () => void 0,
  error: () => void 0,
  info: () => void 0,
};

// Category icons mapping
const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    aws: "🟠",
    azure: "☁️",
    default: "📝",
    docker: "🐳",
    kubernetes: "⚙️",
    terraform: "🏗️",
  };
  return icons[category.toLowerCase()] || icons.default;
};

export default function MCPPrompts(): JSX.Element {
  const [prompts, setPrompts] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);
  const [promptContents, setPromptContents] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    const loadPrompts = async () => {
      try {
        // Dynamic import to avoid build issues
        const { getPrompts, setLogger } = await import("@pagopa/dx-mcpprompts");

        // Set silent logger for browser environment
        setLogger(silentLogger);

        const allPrompts = await getPrompts();
        setPrompts(allPrompts);

        // Load prompt contents for hover overlay with example arguments
        const contents: Record<string, string> = {};
        for (const prompt of allPrompts) {
          try {
            // Generate example arguments - simple placeholder for each argument
            const exampleArgs: Record<string, unknown> = {};
            prompt.prompt.arguments.forEach((arg) => {
              exampleArgs[arg.name] = `[${arg.name}]`;
            });

            const result = await prompt.prompt.load(exampleArgs);
            let content = "";

            // Handle both string and object return types
            if (typeof result === "string") {
              content = result;
            } else if (
              result &&
              typeof result === "object" &&
              "content" in result
            ) {
              const resultObj = result as {
                content: { text: string; type: string }[];
              };
              content = resultObj.content[0]?.text || "No content available";
            } else {
              content = String(result) || "No content available";
            }

            // Highlight argument values in the content with styled labels
            let highlightedContent = content;
            prompt.prompt.arguments.forEach((arg) => {
              const value = exampleArgs[arg.name] as string;
              if (value && content.includes(value)) {
                highlightedContent = highlightedContent.replace(
                  new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
                  `<span class="argument-highlight">${value}</span>`,
                );
              }
            });

            contents[prompt.id] = highlightedContent;
          } catch (err) {
            console.warn(
              `Failed to load content for prompt ${prompt.id}:`,
              err,
            );
            contents[prompt.id] = "Preview not available";
          }
        }
        setPromptContents(contents);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load prompts");
      } finally {
        setLoading(false);
      }
    };

    loadPrompts();
  }, []);

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
          <div className={styles.promptCard} key={prompt.id}>
            <div className={styles.promptCardContent}>
              <div className={styles.promptHeader}>
                <div className={styles.promptIcon}>
                  {getCategoryIcon(prompt.category)}
                </div>
                <div className={styles.promptTitleSection}>
                  <h3 className={styles.promptTitle}>
                    {prompt.metadata.title}
                  </h3>
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

            {/* Hover overlay with full prompt content */}
            <div className={styles.hoverOverlay}>
              <h4 className={styles.overlayTitle}>Prompt Content Preview</h4>
              <div
                className={styles.overlayContent}
                dangerouslySetInnerHTML={{
                  __html: promptContents[prompt.id] || "Loading...",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
