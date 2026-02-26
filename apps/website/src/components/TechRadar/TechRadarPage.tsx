import { usePluginData } from "@docusaurus/useGlobalData";
import React, { useMemo, useState } from "react";

import type { RadarEntry, Ring } from "./types";

import RadarCard from "./RadarCard";
import styles from "./TechRadar.module.css";
import { RING_META, RING_ORDER } from "./types";

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

  const [search, setSearch] = useState("");
  const [activeRings, setActiveRings] = useState<ReadonlySet<Ring>>(
    new Set(RING_ORDER),
  );
  const [activeTags, setActiveTags] = useState<ReadonlySet<string>>(new Set());

  // Collect all unique tags sorted alphabetically
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const entry of entries) {
      for (const tag of entry.tags) {
        tagSet.add(tag);
      }
    }
    return [...tagSet].sort();
  }, [entries]);

  // Filter entries
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return entries.filter((entry) => {
      // Ring filter
      if (!activeRings.has(entry.ring as Ring)) {
        return false;
      }
      // Tag filter (AND logic)
      for (const tag of activeTags) {
        if (!entry.tags.includes(tag)) {
          return false;
        }
      }
      // Text search
      if (q && !entry.title.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [entries, activeRings, activeTags, search]);

  const toggleRing = (ring: Ring) => {
    setActiveRings((prev) => {
      const next = new Set(prev);
      if (next.has(ring)) {
        // Don't allow deselecting all rings
        if (next.size > 1) {
          next.delete(ring);
        }
      } else {
        next.add(ring);
      }
      return next;
    });
  };

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearch("");
    setActiveRings(new Set(RING_ORDER));
    setActiveTags(new Set());
  };

  const hasActiveFilters =
    search.length > 0 ||
    activeRings.size !== RING_ORDER.length ||
    activeTags.size > 0;

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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search technologies..."
            type="text"
            value={search}
          />
          {hasActiveFilters && (
            <button
              className={styles.clearButton}
              onClick={clearFilters}
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
              const isActive = activeRings.has(ring);
              return (
                <button
                  className={`${styles.ringToggle} ${
                    isActive
                      ? RING_TOGGLE_ACTIVE_CLASS[ring]
                      : styles.ringToggleInactive
                  }`}
                  key={ring}
                  onClick={() => toggleRing(ring)}
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
            {allTags.map((tag) => (
              <button
                className={`${styles.tagChip} ${
                  activeTags.has(tag) ? styles.tagChipActive : ""
                }`}
                key={tag}
                onClick={() => toggleTag(tag)}
                type="button"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className={styles.resultsBar}>
        Showing {filtered.length} of {entries.length} entries
      </div>

      {/* Card grid */}
      {filtered.length > 0 ? (
        <div className={styles.grid}>
          {filtered.map((entry) => (
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
