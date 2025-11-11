import React from "react";

import styles from "./MCPPrompts.module.css";

interface CategoryOverviewCardProps {
  category: string;
  icon: string;
  onExplore: () => void;
  promptCount: number;
}

const getCategoryDescription = (category: string): string => {
  const descriptions: Record<string, string> = {
    azure: "Azure cloud services and optimization",
    development: "Development workflows and best practices",
    operations: "Production operations and troubleshooting",
    terraform: "Infrastructure as Code tools and configurations",
  };
  return descriptions[category] || "Helpful prompts and tools";
};

export default function CategoryOverviewCard({
  category,
  icon,
  onExplore,
  promptCount,
}: CategoryOverviewCardProps): JSX.Element {
  return (
    <div className={styles.categoryOverviewCard}>
      <div className={styles.categoryCardHeader}>
        <div className={styles.categoryCardIcon}>{icon}</div>
        <h3 className={styles.categoryCardTitle}>
          {category.charAt(0).toUpperCase() + category.slice(1)}
        </h3>
      </div>
      <p className={styles.categoryCardDescription}>
        {getCategoryDescription(category)}
      </p>
      <div className={styles.categoryCardFooter}>
        <span className={styles.categoryCardCount}>{promptCount} prompts</span>
        <button className={styles.categoryCardButton} onClick={onExplore}>
          Explore →
        </button>
      </div>
    </div>
  );
}
