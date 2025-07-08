import { describe, expect, it } from "vitest";

import { Dependency, DependencyName } from "../../../domain/package-json.js";
import { makeDependencyVersionValidator } from "../dependency-version-validator.js";

describe("DependencyVersionValidator", () => {
  const minVersion = "2.5.0";
  const validDependency: Dependency = {
    name: "turbo" as DependencyName,
    version: "3.0.0",
  };
  describe("isValid", () => {
    it("should handle exact versions", () => {
      const validator = makeDependencyVersionValidator();

      const minVersion = "2";
      // 3.0.0 is greater than 2.5.0
      expect(validator.isValid(validDependency, minVersion)).toBe(true);

      // 2.5.0 is greater than 2.5.0
      const anotherValidDependency = {
        ...validDependency,
        version: "2.5.0",
      };
      expect(validator.isValid(anotherValidDependency, minVersion)).toBe(true);

      // 1.0.0 is less than 2.5.0
      const invalidDependency = {
        ...validDependency,
        version: "1.0.0",
      };
      expect(validator.isValid(invalidDependency, minVersion)).toBe(false);
    });

    it("should handle invalid versions", () => {
      const validator = makeDependencyVersionValidator();
      const invalidDependency: Dependency = {
        name: "turbo" as DependencyName,
        version: "invalid-version",
      };

      expect(validator.isValid(invalidDependency, minVersion)).toBe(false);

      const anotherValidDependency = {
        ...validDependency,
        version: "",
      };
      expect(validator.isValid(anotherValidDependency, minVersion)).toBe(false);
    });

    it("should handle caret versions", () => {
      const validator = makeDependencyVersionValidator();
      const dependency: Dependency = {
        name: "turbo" as DependencyName,
        version: "^3.0.0",
      };

      // ^3.0.0 is greater than 2.5.0
      expect(validator.isValid(dependency, minVersion)).toBe(true);

      // ^2.5.0 is greater than 2.5.0
      const anotherValidDependency = {
        ...validDependency,
        version: "^2.5.0",
      };
      expect(validator.isValid(anotherValidDependency, minVersion)).toBe(true);

      // ^2.4.0 is less than 2.5.0
      const invalidDependency = {
        ...validDependency,
        version: "^2.4.0",
      };
      expect(validator.isValid(invalidDependency, minVersion)).toBe(false);

      // ^1.0.0 is less than 2.5.0
      const anotherInvalidDependency = {
        ...validDependency,
        version: "^1.0.0",
      };
      expect(validator.isValid(anotherInvalidDependency, minVersion)).toBe(
        false,
      );

      // ^2.6.0-beta.1 is greater than 2.5.0
      const aValidBetaDependency = {
        ...validDependency,
        version: "^2.6.0-beta.1",
      };
      expect(validator.isValid(aValidBetaDependency, minVersion)).toBe(true);

      // ^2.4.0-beta.1 is less than 2.5.0
      const anInvalidBetaDependency = {
        ...validDependency,
        version: "^2.4.0-beta.1",
      };
      expect(validator.isValid(anInvalidBetaDependency, minVersion)).toBe(
        false,
      );
    });
  });
});
