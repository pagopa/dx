import Link from "@docusaurus/Link";
import React from "react";

import type { RadarEntry, Ring } from "./types";

import styles from "./TechRadar.module.css";
import { RING_META } from "./types";

const RING_CARD_CLASS: Record<Ring, string> = {
  adopt: styles.ringAdopt,
  assess: styles.ringAssess,
  hold: styles.ringHold,
  trial: styles.ringTrial,
};

const RING_BADGE_CLASS: Record<Ring, string> = {
  adopt: styles.badgeAdopt,
  assess: styles.badgeAssess,
  hold: styles.badgeHold,
  trial: styles.badgeTrial,
};

interface RadarCardProps {
  readonly entry: RadarEntry;
}

export default function RadarCard({
  entry,
}: RadarCardProps): React.JSX.Element {
  const ring = entry.ring as Ring;
  const meta = RING_META[ring];
  const cardClass = RING_CARD_CLASS[ring] ?? "";
  const badgeClass = RING_BADGE_CLASS[ring] ?? "";

  return (
    <Link className={`${styles.card} ${cardClass}`} to={`/radar/${entry.slug}`}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{entry.title}</span>
        <span className={`${styles.ringBadge} ${badgeClass}`}>
          <span className={styles.ringIcon}>{meta?.icon ?? "•"}</span>
          {meta?.label ?? ring}
        </span>
      </div>
      {entry.description && (
        <p className={styles.cardDescription}>{entry.description}</p>
      )}
      <div className={styles.cardTags}>
        {entry.tags.map((tag) => (
          <span className={styles.cardTag} key={tag}>
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}
