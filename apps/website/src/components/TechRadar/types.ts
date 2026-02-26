export interface RadarEntry {
  readonly description: string;
  readonly ring: string;
  readonly slug: string;
  readonly tags: readonly string[];
  readonly title: string;
}

export type Ring = "adopt" | "assess" | "hold" | "trial";

export const RING_ORDER: readonly Ring[] = ["adopt", "trial", "assess", "hold"];

export interface RingMeta {
  readonly color: string;
  readonly colorDark: string;
  readonly description: string;
  readonly icon: string;
  readonly label: string;
}

export const RING_META: Record<Ring, RingMeta> = {
  adopt: {
    color: "#d4edda",
    colorDark: "#1a3a2a",
    description: "Proven and recommended for use",
    icon: "✓",
    label: "Adopt",
  },
  assess: {
    color: "#fff3cd",
    colorDark: "#3a3520",
    description: "Worth investigating",
    icon: "?",
    label: "Assess",
  },
  hold: {
    color: "#f8d7da",
    colorDark: "#3a1a1d",
    description: "Do not start new usage",
    icon: "✕",
    label: "Hold",
  },
  trial: {
    color: "#d1ecf1",
    colorDark: "#1a2e3a",
    description: "Worth trying in projects",
    icon: "▲",
    label: "Trial",
  },
};
