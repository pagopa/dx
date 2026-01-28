// These are the only regions we currently support for DX

import type { CloudRegion } from "../../domain/cloud-account.js";

// Order matters! they go from the preferred to the less preferred ones
export const locations = ["italynorth", "westeurope"] as const;

export type AzureLocation = (typeof locations)[number];

export function isAzureLocation(location: string): location is AzureLocation {
  return locations.includes(location as AzureLocation);
}

// The default location is the first one
export const defaultLocation = locations[0];

export const locationShort: Record<AzureLocation, string> = {
  italynorth: "itn",
  westeurope: "weu",
};

const displayName: Record<AzureLocation, string> = {
  italynorth: "Italy North",
  westeurope: "West Europe",
};

export const cloudRegions: CloudRegion[] = locations.map((l) => ({
  displayName: displayName[l],
  name: l,
  short: locationShort[l],
}));
