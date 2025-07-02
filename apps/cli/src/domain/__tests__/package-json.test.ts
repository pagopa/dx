import { errAsync, okAsync } from "neverthrow";
import { describe, expect, it } from "vitest";

import {
  RootRequiredScript,
  Script,
  checkMonorepoScripts,
} from "../package-json.js";
import { makeMockDependencies } from "./data.js";

describe("checkMonorepoScripts", () => {
  const monorepoDir = "/path/to/monorepo";

  it("should return error result when getScripts fails", async () => {
    const deps = makeMockDependencies();

    const errorMessage = "Oh No!";
    deps.packageJsonReader.getScripts.mockReturnValueOnce(
      errAsync(new Error(errorMessage)),
    );

    const result = await checkMonorepoScripts(monorepoDir)(deps);

    expect(result.isErr()).toBe(true);
  });

  it("should return ok result with successful validation when all required scripts are present", async () => {
    const deps = makeMockDependencies();

    const scripts = [
      {
        name: "build",
        script: "eslint .",
      },
      {
        name: "code-review",
        script: "eslint .",
      },
    ] as Script[];
    deps.packageJsonReader.getScripts.mockReturnValueOnce(okAsync(scripts));
    deps.packageJsonReader.getRootRequiredScripts.mockReturnValueOnce([
      { name: "code-review" as Script["name"] },
    ] as RootRequiredScript[]);

    const result = await checkMonorepoScripts(monorepoDir)(deps);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const validation = result.value;
      expect(validation.isValid).toBe(true);
      expect(validation.checkName).toBe("Monorepo Scripts");
      if (validation.isValid) {
        expect(validation.successMessage).toBe(
          "Monorepo scripts are correctly set up",
        );
      }
    }
  });

  it("should return ok result with failed validation when required scripts are missing", async () => {
    const deps = makeMockDependencies();

    deps.packageJsonReader.getScripts.mockReturnValueOnce(okAsync([]));
    deps.packageJsonReader.getRootRequiredScripts.mockReturnValueOnce([
      { name: "code-review" as Script["name"] },
    ] as RootRequiredScript[]);

    const result = await checkMonorepoScripts(monorepoDir)(deps);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const validation = result.value;
      expect(validation.isValid).toBe(false);
      expect(validation.checkName).toBe("Monorepo Scripts");
      if (!validation.isValid) {
        expect(validation.errorMessage).toContain(
          "Missing required scripts: code-review",
        );
      }
    }
  });
});
