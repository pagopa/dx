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
