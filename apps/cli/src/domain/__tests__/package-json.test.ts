import { errAsync, ok, okAsync } from "neverthrow";
import { describe, expect, it } from "vitest";

import { checkMonorepoScripts } from "../package-json.js";
import { makeMockDependencies } from "./data.js";

describe("checkMonorepoScripts", () => {
  const monorepoDir = "/path/to/monorepo";

  it("should return error result when getScripts fails", async () => {
    const deps = makeMockDependencies();

    const errorMessage = "Oh No!";
    deps.packageJsonReader.getScripts.mockReturnValueOnce(
      errAsync(new Error(errorMessage)),
    );

    const result = await checkMonorepoScripts(deps, monorepoDir);

    expect(result.isErr()).toBe(true);
  });

  it("should return ok result with successful validation when all required scripts are present", async () => {
    const deps = makeMockDependencies();

    const scripts = new Map()
      .set("build", "eslint .")
      .set("code-review", "eslint .");
    deps.packageJsonReader.getScripts.mockReturnValueOnce(okAsync(scripts));
    deps.packageJsonReader.getRootRequiredScripts.mockReturnValueOnce(
      new Map().set("code-review", "eslint ."),
    );

    const result = await checkMonorepoScripts(deps, monorepoDir);

    expect(result).toStrictEqual(
      ok({
        checkName: "Monorepo Scripts",
        isValid: true,
        successMessage: "Monorepo scripts are correctly set up",
      }),
    );
  });

  it("should return ok result with failed validation when required scripts are missing", async () => {
    const deps = makeMockDependencies();

    deps.packageJsonReader.getScripts.mockReturnValueOnce(okAsync(new Map()));
    deps.packageJsonReader.getRootRequiredScripts.mockReturnValueOnce(
      new Map().set("code-review", "eslint ."),
    );

    const result = await checkMonorepoScripts(deps, monorepoDir);

    expect(result).toStrictEqual(
      ok({
        checkName: "Monorepo Scripts",
        errorMessage: "Missing required scripts: code-review",
        isValid: false,
      }),
    );
  });
});
