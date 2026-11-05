/**
 * Azure authorization group configuration
 *
 * Defines the Azure AD groups that the PagoPA Technology adapter manages
 * inside the subscription authorization repository.
 */

type AzureAdGroupSpec = {
  readonly groupName: string;
  readonly roles: readonly string[];
};

export const DEFAULT_GROUP_SPECS: readonly AzureAdGroupSpec[] = [
  { groupName: "admin", roles: ["Contributor"] },
  { groupName: "developers", roles: ["Reader"] },
  { groupName: "externals", roles: ["Reader"] },
];

export const makeAzureAdGroupName = (
  prefix: string,
  envShort: string,
  groupName: string,
): string => `${prefix}-${envShort}-adgroup-${groupName}`;
