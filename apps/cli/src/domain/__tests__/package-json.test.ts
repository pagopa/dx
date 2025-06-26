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

  it("should log and return error result", async () => {
    const deps = makeMockDependencies();

    // If getScripts returns error, it should log the error message and return error result
    const errorMessage = "Oh No!";
    deps.packageJsonReader.getScripts.mockReturnValueOnce(
      errAsync(new Error(errorMessage)),
    );

    const result = await checkMonorepoScripts(monorepoDir)(deps);

    expect(result.isErr()).toBe(true);
    expect(deps.logger.error).toBeCalledWith(errorMessage);
  });

  it("should log the success message and return ok result", async () => {
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
    expect(deps.logger.success).toHaveBeenCalledTimes(1);
  });

  it("should log the missing script error message and return error result", async () => {
    const deps = makeMockDependencies();

    deps.packageJsonReader.getScripts.mockReturnValueOnce(okAsync([]));
    deps.packageJsonReader.getRootRequiredScripts.mockReturnValueOnce([
      { name: "code-review" as Script["name"] },
    ] as RootRequiredScript[]);

    const result = await checkMonorepoScripts(monorepoDir)(deps);

    expect(result.isErr()).toBe(true);
    expect(deps.logger.error).toHaveBeenCalledWith(
      "Missing required scripts: code-review",
    );
  });
});
