/** Shared DX Metrics configuration defaults consumed by the portal and importer. */

export interface DxMetricsConfig {
  readonly dxRepo: string;
  readonly dxTeamSlug: string;
  readonly organization: string;
  readonly repositories: readonly DxMetricsRepository[];
}

/**
 * A repository the importer scans, with the visibility tags the portal uses to
 * decide who may see it. A repository may carry several tags; a tag is a
 * programme or ownership boundary, not a naming rule.
 */
export interface DxMetricsRepository {
  readonly name: string;
  readonly tags: readonly string[];
}

/**
 * Repository list grouped by visibility tag. Every repository must carry at
 * least one tag, or it is visible to nobody: the portal's test suite rejects a
 * list where that happens.
 *
 * Only public repositories belong here. The portal publishes their metrics to
 * anyone holding a scope link, and a link grants no GitHub permission of its
 * own, so listing a private repository would show it to people who cannot open
 * it on GitHub.
 */
export const dxMetricsConfig: DxMetricsConfig = {
  dxRepo: "dx",
  dxTeamSlug: "engineering-team-devex",
  organization: "pagopa",
  repositories: [
    // DX's own repository.
    { name: "dx", tags: ["dx"] },

    // IO app and platform.
    { name: "io-app", tags: ["io"] },
    { name: "io-auth-n-identity-domain", tags: ["io"] },
    { name: "io-cdc", tags: ["io"] },
    { name: "io-cgn", tags: ["io"] },
    { name: "io-growth", tags: ["io"] },
    { name: "io-infra", tags: ["io"] },
    { name: "io-ipatente", tags: ["io"] },
    { name: "io-messages", tags: ["io"] },
    { name: "io-platform-core", tags: ["io"] },
    { name: "io-services-cms", tags: ["io"] },
    { name: "io-sign", tags: ["io"] },
    { name: "io-wallet", tags: ["io"] },
    { name: "io-wallet-sdk", tags: ["io"] },
    { name: "wallet-conformance-test", tags: ["io"] },

    // Developer and business-to-business portals.
    { name: "b2b-portals", tags: ["portals"] },
    { name: "developer-portal", tags: ["portals"] },

    // PDND and Interoperability, treated as one category.
    { name: "interop-analytics-deployment", tags: ["pdnd"] },
    { name: "interop-be-monorepo", tags: ["pdnd"] },
    { name: "interop-core-deployment", tags: ["pdnd"] },
    { name: "interop-infra-commons", tags: ["pdnd"] },
    { name: "interop-qa-tests", tags: ["pdnd"] },
    { name: "pdnd-interop-frontend", tags: ["pdnd"] },

    // IDPay, including CStar.
    { name: "cstar-infrastructure", tags: ["idpay"] },
    { name: "cstar-platform-azure-devops", tags: ["idpay"] },
    { name: "cstar-securehub-infra", tags: ["idpay"] },
    { name: "cstar-securehub-infra-api-spec", tags: ["idpay"] },
    { name: "idpay-asset-register-backend", tags: ["idpay"] },
    { name: "idpay-asset-register-frontend", tags: ["idpay"] },
    { name: "idpay-deploy-aks", tags: ["idpay"] },
    { name: "idpay-notification-manager", tags: ["idpay"] },
    { name: "idpay-onboarding-workflow", tags: ["idpay"] },
    { name: "idpay-payment", tags: ["idpay"] },
    { name: "idpay-portal-merchants-frontend", tags: ["idpay"] },
    { name: "idpay-portal-merchants-operator-frontend", tags: ["idpay"] },
    { name: "idpay-portal-users-frontend", tags: ["idpay"] },
    { name: "idpay-portal-welfare-backend-initiative", tags: ["idpay"] },
    { name: "idpay-portal-welfare-frontend", tags: ["idpay"] },
    { name: "idpay-product-catalog-portal", tags: ["idpay"] },
    { name: "idpay-ranker", tags: ["idpay"] },
    { name: "idpay-transactions", tags: ["idpay"] },

    // Self-care.
    { name: "selfcare", tags: ["selfcare"] },
    { name: "selfcare-infra", tags: ["selfcare"] },

    // Service management.
    { name: "plsm-service-management", tags: ["plsm"] },

    // SEND (Piattaforma Notifiche).
    { name: "pn-action-manager", tags: ["pn"] },
    { name: "pn-address-manager", tags: ["pn"] },
    { name: "pn-b2b-client", tags: ["pn"] },
    { name: "pn-bfhd", tags: ["pn"] },
    { name: "pn-bff", tags: ["pn"] },
    { name: "pn-cicd", tags: ["pn"] },
    { name: "pn-commons", tags: ["pn"] },
    { name: "pn-data-vault", tags: ["pn"] },
    { name: "pn-delivery", tags: ["pn"] },
    { name: "pn-delivery-push", tags: ["pn"] },
    { name: "pn-delivery-push-validator", tags: ["pn"] },
    { name: "pn-delivery-push-workflow", tags: ["pn"] },
    { name: "pn-ec", tags: ["pn"] },
    { name: "pn-external-channels", tags: ["pn"] },
    { name: "pn-frontend", tags: ["pn"] },
    { name: "pn-infra", tags: ["pn"] },
    { name: "pn-io-connector", tags: ["pn"] },
    { name: "pn-national-registries", tags: ["pn"] },
    { name: "pn-paper-tracker", tags: ["pn"] },
    { name: "pn-pdfraster", tags: ["pn"] },
    { name: "pn-portfat", tags: ["pn"] },
    { name: "pn-simulatore-recapiti", tags: ["pn"] },
    { name: "pn-ss", tags: ["pn"] },
    { name: "pn-statemachinemanager", tags: ["pn"] },
    { name: "pn-stream", tags: ["pn"] },
    { name: "pn-templates-engine", tags: ["pn"] },
    { name: "pn-timeline-service", tags: ["pn"] },
    { name: "pn-user-attributes", tags: ["pn"] },
    { name: "pn-workflow-manager", tags: ["pn"] },

    // PagoPA core and e-commerce.
    { name: "pagopa-checkout-fe", tags: ["pagopa"] },
    { name: "pagopa-cruscotto-sert-backend", tags: ["pagopa"] },
    { name: "pagopa-ecommerce-fe", tags: ["pagopa"] },
    { name: "pagopa-ecommerce-helpdesk-commands-service", tags: ["pagopa"] },
    { name: "pagopa-ecommerce-payment-requests-service", tags: ["pagopa"] },
    { name: "pagopa-ecommerce-transactions-service", tags: ["pagopa"] },
    { name: "pagopa-infra", tags: ["pagopa"] },
    { name: "pagopa-infra-core", tags: ["pagopa"] },
    { name: "pagopa-receipt-pdf-generator", tags: ["pagopa"] },

    // P4PA.
    { name: "p4pa-analytics-deploy-aks", tags: ["p4pa"] },
    { name: "p4pa-classification", tags: ["p4pa"] },
    { name: "p4pa-debt-positions", tags: ["p4pa"] },
    { name: "p4pa-doc", tags: ["p4pa"] },
    { name: "p4pa-fileshare", tags: ["p4pa"] },
    { name: "p4pa-payhub-deploy-aks", tags: ["p4pa"] },
    { name: "p4pa-pu-bff", tags: ["p4pa"] },
    { name: "p4pa-pu-fe", tags: ["p4pa"] },
    { name: "p4pa-pu-feature-test", tags: ["p4pa"] },
    { name: "p4pa-pu-sil", tags: ["p4pa"] },
    { name: "p4pa-registries", tags: ["p4pa"] },
    { name: "p4pa-send-notification", tags: ["p4pa"] },
    { name: "p4pa-workflow-hub", tags: ["p4pa"] },
    { name: "p4pa-workflow-worker", tags: ["p4pa"] },

    // Onboarding and PDV (Privacy Data Vault), one category.
    { name: "onemail", tags: ["bb"] },
    { name: "oneidentity", tags: ["bb"] },
    { name: "pdv-lambda-expose-usage-plan-details", tags: ["bb"] },
    { name: "pdv-lambda-usage-plans", tags: ["bb"] },
    { name: "pdv-load-tests", tags: ["bb"] },
    { name: "pdv-ms-person", tags: ["bb"] },
    { name: "pdv-ms-user-registry", tags: ["bb"] },
    { name: "pdv-tokenizer-infra", tags: ["bb"] },
    { name: "pdv-user-registry-infra", tags: ["bb"] },
  ],
};

/**
 * Importer-facing configuration. The importer scans every configured
 * repository; tags are a portal concern and do not affect importing.
 */
export const defaultImportFileConfig = {
  dxRepo: dxMetricsConfig.dxRepo,
  dxTeamSlug: dxMetricsConfig.dxTeamSlug,
  organization: dxMetricsConfig.organization,
  repositories: dxMetricsConfig.repositories.map(
    (repository) => repository.name,
  ),
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
