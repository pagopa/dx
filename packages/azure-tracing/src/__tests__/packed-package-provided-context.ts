/**
 * Contract between the integration global setup that packs the package and the
 * suites that consume the resulting tarball.
 */
import { inject } from "vitest";

export const packedPackageTarballPathKey = "packedPackageTarballPath";

declare module "vitest" {
  interface ProvidedContext {
    packedPackageTarballPath: string;
  }
}

/**
 * Returns the tarball produced once per integration run by the global setup, so
 * that suites install the published artifact without packing it again.
 */
export const getPackedPackageTarballPath = () =>
  inject(packedPackageTarballPathKey);
