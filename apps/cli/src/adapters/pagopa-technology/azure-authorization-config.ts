/**
 * Azure authorization group configuration
 *
 * Defines the default Azure AD groups that the PagoPA Technology adapter
 * keeps aligned inside the subscription authorization repository.
 */

type AzureAdGroupSpec = {
  readonly groupName: string;
  readonly roles: readonly string[];
};

export const DEFAULT_GROUP_SPECS: readonly AzureAdGroupSpec[] = [
  { groupName: "admin", roles: ["Owner"] },
  { groupName: "developers", roles: ["Owner"] },
  {
    groupName: "operations",
    roles: [
      "Reader",
      "Monitoring Contributor",
      "Support Request Contributor",
      "Storage Blob Data Reader",
      "Storage Queue Data Reader",
      "Cosmos DB Account Reader Role",
    ],
  },
  { groupName: "security", roles: ["Reader", "Support Request Contributor"] },
  {
    groupName: "technical-project-managers",
    roles: ["Reader", "Monitoring Contributor", "Support Request Contributor"],
  },
  {
    groupName: "product-owners",
    roles: ["Reader", "Support Request Contributor"],
  },
  { groupName: "externals", roles: ["Owner"] },
  {
    groupName: "oncall",
    roles: [
      "Reader",
      "Monitoring Contributor",
      "Support Request Contributor",
      "Storage Blob Data Reader",
      "Storage Queue Data Reader",
      "Cosmos DB Account Reader Role",
    ],
  },
];

export const makeAzureAdGroupName = (
  prefix: string,
  envShort: string,
  groupName: string,
): string => `${prefix}-${envShort}-adgroup-${groupName}`;
