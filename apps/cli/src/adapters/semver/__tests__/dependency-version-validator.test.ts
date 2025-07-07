import { describe, expect, it } from "vitest";

import { Dependency, DependencyName } from "../../../domain/package-json.js";
import { makeDependencyVersionValidator } from "../dependency-version-validator.js";

describe("makeDependencyVersionValidator", () => {
  const minVersion = "2.5.0";
  describe("isValid", () => {
    it("should return true when exact version is greater than minimum major version", () => {
      const validator = makeDependencyVersionValidator();
      const dependency: Dependency = {
        name: "turbo" as DependencyName,
        version: "3.0.0",
      };
      const minVersion = "2";

      const result = validator.isValid(dependency, minVersion);

      expect(result).toBe(true);
    });

    it("should return true when exact versions are equals", () => {
      const validator = makeDependencyVersionValidator();
      const dependency: Dependency = {
        name: "turbo" as DependencyName,
        version: "2.5.0",
      };
      const result = validator.isValid(dependency, minVersion);

      expect(result).toBe(true);
    });

    it("should return false when exact version is less than minimum", () => {
      const validator = makeDependencyVersionValidator();
      const dependency: Dependency = {
        name: "turbo" as DependencyName,
        version: "1.0.0",
      };
      const result = validator.isValid(dependency, minVersion);

      expect(result).toBe(false);
    });

    it("should return false for invalid semver versions", () => {
      const validator = makeDependencyVersionValidator();
      const dependency: Dependency = {
        name: "turbo" as DependencyName,
        version: "invalid-version",
      };

      const result = validator.isValid(dependency, minVersion);

      expect(result).toBe(false);
    });

    it("should return false for empty version", () => {
      const validator = makeDependencyVersionValidator();
      const dependency: Dependency = {
        name: "turbo" as DependencyName,
        version: "",
      };

      const result = validator.isValid(dependency, minVersion);

      expect(result).toBe(false);
    });

    it("should handle pre-release versions", () => {
      const validator = makeDependencyVersionValidator();
      const dependency: Dependency = {
        name: "turbo" as DependencyName,
        version: "2.5.0-beta.1",
      };
      const result = validator.isValid(dependency, minVersion);

      expect(result).toBe(false);
    });
  });
});
