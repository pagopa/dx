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
    "io-app",
    "io-auth-n-identity-domain",
    "io-ipatente",
    "io-cgn",
    "io-cdc",
    "io-sign",
    "developer-portal",
    "interop-be-monorepo",
    "interop-core-deployment",
    "pdnd-interop-frontend",
    "idpay-deploy-aks",
    "idpay-transactions",
    "idpay-portal-merchants-frontend",
    "idpay-asset-register-frontend",
    "idpay-asset-register-backend",
    "idpay-portal-merchants-operator-frontend",
    "idpay-portal-users-frontend",
    "idpay-payment",
    "idpay-ranker",
    "idpay-onboarding-workflow",
    "idpay-portal-welfare-backend-initiative",
    "idpay-product-catalog-portal",
    "idpay-notification-manager",
    "idpay-portal-welfare-frontend",
    "cstar-securehub-infra",
    "cstar-platform-azure-devops",
    "cstar-securehub-infra-api-spec",
    "cstar-infrastructure",
    "interop-infra-commons",
    "interop-analytics-deployment",
    "interop-qa-tests",
    "selfcare",
    "plsm-service-management",
    "selfcare-infra",
    "b2b-portals",
    "io-growth",
    "io-wallet-sdk",
    "wallet-conformance-test",
    "io-platform-core",
    "pn-data-vault",
    "pn-infra",
    "pn-delivery",
    "pn-b2b-client",
    "pn-pdfraster",
    "pn-frontend",
    "pn-ss",
    "pn-ec",
    "pn-delivery-push-workflow",
    "pn-commons",
    "pn-bfhd",
    "pn-timeline-service",
    "pn-workflow-manager",
    "pn-cicd",
    "pn-external-channels",
    "pn-bff",
    "pn-statemachinemanager",
    "pn-io-connector",
    "pn-stream",
    "pn-user-attributes",
    "pn-paper-tracker",
    "pn-delivery-push-validator",
    "pn-action-manager",
    "pn-delivery-push",
    "pn-templates-engine",
    "pn-address-manager",
    "pn-simulatore-recapiti",
    "pn-national-registries",
    "pn-portfat",
    "pagopa-infra-core",
    "pagopa-infra",
    "pagopa-ecommerce-transactions-service",
    "pagopa-cruscotto-sert-backend",
    "pagopa-checkout-fe",
    "pagopa-ecommerce-fe",
    "pagopa-receipt-pdf-generator",
    "pagopa-ecommerce-payment-requests-service",
    "pagopa-ecommerce-helpdesk-commands-service",
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
