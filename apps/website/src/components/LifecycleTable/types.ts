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
  readonly icon: string;
  readonly label: string;
}

export const STATUS_META: Record<VersionStatus, StatusMeta> = {
  active: {
    icon: "✓",
    label: "Active",
  },
  deprecated: {
    icon: "⚠",
    label: "Deprecated",
  },
  eol: {
    icon: "✕",
    label: "End of Life",
  },
  maintenance: {
    icon: "◆",
    label: "Maintenance",
  },
};
