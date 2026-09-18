/** Shared DX Metrics configuration defaults consumed by the portal and importer. */

export interface DxMetricsConfig {
  readonly dxRepo: string;
  readonly dxTeamSlug: string;
  readonly organization: string;
  readonly repositories: readonly string[];
}

export const dxMetricsConfig: DxMetricsConfig = {
  dxRepo: "dx",
  dxTeamSlug: "engineering-team-devex",
  organization: "pagopa",
  repositories: [
    "dx",
    "io-infra",
    "io-wallet",
    "io-messages",
    "io-services-cms",
    "io-auth-n-identity-domain",
    "io-ipatente",
    "io-cgn",
    "io-cdc",
    "io-sign",
    "developer-portal",
    "interop-be-monorepo",
    "selfcare",
    "plsm-service-management",
    "selfcare-infra",
    "b2b-portals",
    "io-growth",
    "io-wallet-sdk",
    "wallet-conformance-test",
    "io-platform-core",
  ],
};

export const defaultImportFileConfig = {
  dxRepo: dxMetricsConfig.dxRepo,
  dxTeamSlug: dxMetricsConfig.dxTeamSlug,
  organization: dxMetricsConfig.organization,
  repositories: [...dxMetricsConfig.repositories],
};

/**
 * Reserved `toolKey` for the snapshot row written when a successful import
 * detects no tech-radar usages at all. It keeps "zero adoption" distinguishable
 * from "no snapshot recorded" in the usage trend, and is excluded from adoption
 * figures by the portal.
 */
export const TECH_RADAR_SNAPSHOT_MARKER_TOOL_KEY = "__snapshot_marker__";

/** Display name paired with {@link TECH_RADAR_SNAPSHOT_MARKER_TOOL_KEY}. */
export const TECH_RADAR_SNAPSHOT_MARKER_TOOL_NAME = "No detected tools";

/** Radar status stored on the zero-adoption marker row. */
export const TECH_RADAR_SNAPSHOT_MARKER_STATUS = "none";
