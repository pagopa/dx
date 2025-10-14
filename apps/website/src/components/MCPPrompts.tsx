import React, { useState } from "react";

import CategoryOverviewCard from "./CategoryOverviewCard";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"categories" | "prompts">(
    "categories",
  );

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

  const filteredPrompts = prompts.filter((prompt) => {
    const matchesSearch =
      searchTerm === "" ||
      prompt.metadata.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.metadata.description
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      prompt.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase()),
      );

    const matchesCategory =
      selectedCategory === "all" || prompt.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const promptsByCategory = filteredPrompts.reduce(
    (acc, prompt) => {
      if (!acc[prompt.category]) {
        acc[prompt.category] = [];
      }
      acc[prompt.category].push(prompt);
      return acc;
    },
    {} as Record<string, CatalogEntry[]>,
  );

  const categories = Array.from(new Set(prompts.map((p) => p.category)));

  return (
    <div className={styles.promptsContainer}>
      <div className={styles.controlsSection}>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.toggleButton} ${viewMode === "categories" ? styles.active : ""}`}
            onClick={() => setViewMode("categories")}
          >
            📂 Categories
          </button>
          <button
            className={`${styles.toggleButton} ${viewMode === "prompts" ? styles.active : ""}`}
            onClick={() => {
              setViewMode("prompts");
              setSelectedCategory("all");
              setSearchTerm("");
            }}
          >
            📝 All Prompts
          </button>
        </div>
        {viewMode === "prompts" && (
          <>
            <div className={styles.searchBox}>
              <input
                className={styles.searchInput}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search prompts..."
                type="text"
                value={searchTerm}
              />
            </div>
            <div className={styles.filterBox}>
              <select
                className={styles.categoryFilter}
                onChange={(e) => setSelectedCategory(e.target.value)}
                value={selectedCategory}
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {getCategoryIcon(category)}{" "}
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {viewMode === "prompts" && (
        <div className={styles.resultsInfo}>
          {searchTerm || selectedCategory !== "all" ? (
            <span>
              Found {filteredPrompts.length} prompt
              {filteredPrompts.length !== 1 ? "s" : ""}
            </span>
          ) : (
            <span>{prompts.length} total prompts</span>
          )}
        </div>
      )}

      {viewMode === "categories" ? (
        <div className={styles.categoriesGrid}>
          {categories.map((category) => {
            const categoryPrompts = prompts.filter(
              (p) => p.category === category,
            );
            return (
              <CategoryOverviewCard
                category={category}
                icon={getCategoryIcon(category)}
                key={category}
                onExplore={() => {
                  setSelectedCategory(category);
                  setViewMode("prompts");
                }}
                promptCount={categoryPrompts.length}
              />
            );
          })}
        </div>
      ) : (
        Object.entries(promptsByCategory).map(([category, categoryPrompts]) => (
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
        ))
      )}
    </div>
  );
}
