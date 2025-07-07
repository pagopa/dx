import { coerce, satisfies, valid } from "semver";

import {
  Dependency,
  DependencyVersionValidator,
} from "../../domain/package-json.js";

export const makeDependencyVersionValidator =
  (): DependencyVersionValidator => ({
    isValid: (dependency: Dependency, minVersion: string): boolean => {
      // Check if the dependency version is valid semver or a valid range
      if (!valid(dependency.version) && !valid(coerce(dependency.version))) {
        return false;
      }

      return satisfies(dependency.version, `>=${minVersion}`);
    },
  });
