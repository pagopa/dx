/** Technology Radar homepage — filterable, URL-synced card grid. */
import { usePluginData } from "@docusaurus/useGlobalData";
import React from "react";

import type { RadarEntry, Ring } from "./types";

import RadarCard from "./RadarCard";
import styles from "./TechRadar.module.css";
import { RING_META, RING_ORDER } from "./types";
import { useRadarFilters } from "./use-radar-filters";

const RING_TOGGLE_ACTIVE_CLASS: Record<Ring, string> = {
  adopt: styles.ringAdopt,
  assess: styles.ringAssess,
  hold: styles.ringHold,
  trial: styles.ringTrial,
};

export default function TechRadarPage(): React.JSX.Element {
  const { entries } = usePluginData("radar-data-loader") as {
    entries: readonly RadarEntry[];
  };

  const filters = useRadarFilters(entries);

  return (
    <div className={styles.radarPage}>
      <div className={styles.header}>
        <h1>Technology Radar</h1>
        <p className={styles.subtitle}>
          Technologies, tools, and practices we use, evaluate, or avoid.
        </p>
      </div>

      {/* Ring legend */}
      <div className={styles.ringLegend}>
        {RING_ORDER.map((ring) => {
          const meta = RING_META[ring];
          return (
            <div className={styles.ringLegendItem} key={ring}>
              <span
                className={`${styles.ringBadge} ${styles[`badge${meta.label}`]}`}
                style={{ fontSize: "0.7rem" }}
              >
                <span className={styles.ringIcon}>{meta.icon}</span>
                {meta.label}
              </span>
              <span>{meta.description}</span>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchRow}>
          <input
            className={styles.searchInput}
            onChange={(e) => filters.handleSearchChange(e.target.value)}
            placeholder="Search technologies..."
            type="text"
            value={filters.search}
          />
          {filters.hasActiveFilters && (
            <button
              className={styles.clearButton}
              onClick={filters.clearFilters}
              type="button"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Ring</span>
          <div className={styles.ringFilters}>
            {RING_ORDER.map((ring) => {
              const meta = RING_META[ring];
              const isActive = filters.activeRings.has(ring);
              return (
                <button
                  className={`${styles.ringToggle} ${
                    isActive
                      ? RING_TOGGLE_ACTIVE_CLASS[ring]
                      : styles.ringToggleInactive
                  }`}
                  key={ring}
                  onClick={() => filters.toggleRing(ring)}
                  type="button"
                >
                  <span className={styles.ringIcon}>{meta.icon}</span>
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Tags</span>
          <div className={styles.tagFilters}>
            {filters.visibleTags.map((tag) => (
              <button
                className={`${styles.tagChip} ${
                  filters.activeTags.has(tag) ? styles.tagChipActive : ""
                }`}
                key={tag}
                onClick={() => filters.toggleTag(tag)}
                type="button"
              >
                {tag}
              </button>
            ))}
            {filters.hiddenTagCount > 0 && (
              <button
                className={styles.showMoreButton}
                onClick={() => filters.setShowAllTags((prev) => !prev)}
                type="button"
              >
                {filters.showAllTags
                  ? "Show less"
                  : `+${filters.hiddenTagCount} more`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className={styles.resultsBar}>
        <span>
          Showing {filters.filtered.length} of {entries.length} entries
        </span>
        {(filters.hasRingFilter || filters.hasTagFilter) && (
          <span className={styles.activeFilters}>
            {filters.hasRingFilter &&
              RING_ORDER.filter((r) => filters.activeRings.has(r)).map(
                (ring) => {
                  const meta = RING_META[ring];
                  return (
                    <span
                      className={`${styles.activeFilterChip} ${styles[`badge${meta.label}`]}`}
                      key={ring}
                    >
                      <span className={styles.ringIcon}>{meta.icon}</span>
                      {meta.label}
                    </span>
                  );
                },
              )}
            {filters.hasTagFilter &&
              [...filters.activeTags].map((tag) => (
                <span className={styles.activeFilterChip} key={tag}>
                  {tag}
                </span>
              ))}
          </span>
        )}
      </div>

      {/* Card grid */}
      {filters.filtered.length > 0 ? (
        <div className={styles.grid}>
          {filters.filtered.map((entry) => (
            <RadarCard entry={entry} key={entry.slug} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <h3>No entries match your filters</h3>
          <p>Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  );
}
