/** Custom hook encapsulating radar filter state and URL synchronization. */
import { useHistory, useLocation } from "@docusaurus/router";
import { useCallback, useMemo, useState } from "react";

import type { RadarEntry, Ring } from "./types";

import { RING_ORDER } from "./types";

const DEFAULT_VISIBLE_TAGS = 10;

export function useRadarFilters(entries: readonly RadarEntry[]) {
  const location = useLocation();
  const history = useHistory();
  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const [search, setSearch] = useState(params.get("q") ?? "");
  const [activeRings, setActiveRings] = useState<ReadonlySet<Ring>>(() =>
    parseRingsParam(params.get("rings")),
  );
  const [activeTags, setActiveTags] = useState<ReadonlySet<string>>(() =>
    parseTagsParam(params.get("tags")),
  );
  const [showAllTags, setShowAllTags] = useState(false);

  /** Push current filter state into the URL query string. */
  const syncUrl = useCallback(
    (
      nextRings: ReadonlySet<Ring>,
      nextTags: ReadonlySet<string>,
      nextSearch: string,
    ) => {
      const qp = new URLSearchParams();
      if (nextRings.size > 0 && nextRings.size < RING_ORDER.length) {
        qp.set("rings", [...nextRings].join(","));
      }
      if (nextTags.size > 0) {
        qp.set("tags", [...nextTags].join(","));
      }
      if (nextSearch.trim()) {
        qp.set("q", nextSearch.trim());
      }
      const qs = qp.toString();
      history.replace({
        pathname: location.pathname,
        search: qs ? `?${qs}` : "",
      });
    },
    [history, location.pathname],
  );

  // Tags ranked by frequency (descending), then alphabetically
  const rankedTags = useMemo(() => {
    const freq = new Map<string, number>();
    for (const entry of entries) {
      for (const tag of entry.tags) {
        freq.set(tag, (freq.get(tag) ?? 0) + 1);
      }
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag);
  }, [entries]);

  const visibleTags = showAllTags
    ? rankedTags
    : rankedTags.slice(0, DEFAULT_VISIBLE_TAGS);

  const hiddenTagCount =
    rankedTags.length > DEFAULT_VISIBLE_TAGS
      ? rankedTags.length - DEFAULT_VISIBLE_TAGS
      : 0;

  // Filter entries
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return entries.filter((entry) => {
      if (!activeRings.has(entry.ring as Ring)) return false;
      for (const tag of activeTags) {
        if (!entry.tags.includes(tag)) return false;
      }
      if (q && !entry.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, activeRings, activeTags, search]);

  const toggleRing = (ring: Ring) => {
    setActiveRings((prev) => {
      const next = new Set(prev);
      if (next.has(ring)) {
        if (next.size > 1) next.delete(ring);
      } else {
        next.add(ring);
      }
      syncUrl(next, activeTags, search);
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
      syncUrl(activeRings, next, search);
      return next;
    });
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    syncUrl(activeRings, activeTags, value);
  };

  const clearFilters = () => {
    setSearch("");
    setActiveRings(new Set(RING_ORDER));
    setActiveTags(new Set());
    syncUrl(new Set(RING_ORDER), new Set(), "");
  };

  const hasActiveFilters =
    search.length > 0 ||
    activeRings.size !== RING_ORDER.length ||
    activeTags.size > 0;

  return {
    activeRings,
    activeTags,
    clearFilters,
    filtered,
    handleSearchChange,
    hasActiveFilters,
    hasRingFilter: activeRings.size !== RING_ORDER.length,
    hasTagFilter: activeTags.size > 0,
    hiddenTagCount,
    search,
    setShowAllTags,
    showAllTags,
    toggleRing,
    toggleTag,
    visibleTags,
  };
}

/** Parse rings from query params, falling back to all rings. */
function parseRingsParam(value: null | string): ReadonlySet<Ring> {
  if (!value) {
    return new Set(RING_ORDER);
  }
  const parsed = value
    .split(",")
    .filter((r): r is Ring => RING_ORDER.includes(r as Ring));
  return parsed.length > 0 ? new Set(parsed) : new Set(RING_ORDER);
}

/** Parse tags from query params. */
function parseTagsParam(value: null | string): ReadonlySet<string> {
  if (!value) {
    return new Set();
  }
  return new Set(value.split(",").filter(Boolean));
}
