import coerce from "semver/functions/coerce.js";
import semverGte from "semver/functions/gte.js";

import {
  Dependency,
  DependencyVersionValidator,
} from "../../domain/package-json.js";

/**
 * Validates if a dependency version meets the minimum version requirement.
 * Handles both exact versions and semver ranges (like caret ranges).
 */
export const makeDependencyVersionValidator =
  (): DependencyVersionValidator => ({
    isValid: ({ version }: Dependency, minVersion: string): boolean => {
      const minAcceptedSemVer = coerce(minVersion);
      const dependencySemVer = coerce(version);

      if (!minAcceptedSemVer || !dependencySemVer) {
        return false;
      }

      return semverGte(dependencySemVer, minAcceptedSemVer);
    },
  });
