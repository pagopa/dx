/** Types for the DX tooling lifecycle data model. */

export type VersionStatus = "active" | "deprecated" | "eol" | "maintenance";

export interface VersionEntry {
  readonly eolDate?: string;
  readonly migrationGuideUrl?: string;
  readonly notes?: string;
  readonly status: VersionStatus;
  readonly supportedSince?: string;
  readonly version: string;
}

export type ToolCategory = "build-tool" | "ci" | "infra" | "runtime";

export interface ToolLifecycle {
  readonly category: ToolCategory;
  readonly communicationChannels: readonly string[];
  readonly id: string;
  readonly lifecyclePolicy: string;
  readonly name: string;
  readonly vendorLifecycleUrl: string;
  readonly versions: readonly VersionEntry[];
}

export interface StatusMeta {
  readonly color: string;
  readonly colorDark: string;
  readonly icon: string;
  readonly label: string;
}

export const STATUS_META: Record<VersionStatus, StatusMeta> = {
  active: {
    color: "#d4edda",
    colorDark: "#1a3a2a",
    icon: "✓",
    label: "Active",
  },
  deprecated: {
    color: "#fff3cd",
    colorDark: "#3a3520",
    icon: "⚠",
    label: "Deprecated",
  },
  eol: {
    color: "#f8d7da",
    colorDark: "#3a1a1d",
    icon: "✕",
    label: "End of Life",
  },
  maintenance: {
    color: "#d1ecf1",
    colorDark: "#1a2e3a",
    icon: "◆",
    label: "Maintenance",
  },
};
