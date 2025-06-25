import { describe, expect, it } from "vitest";

import { Script, checkMonorepoScripts } from "../node.js";
import { makeMockDependencies } from "./data.js";

describe("checkMonorepoScripts", () => {
  const monorepoDir = "/path/to/monorepo";

  it("should log the error", async () => {
    const deps = makeMockDependencies();

    // If promise fails with Error, it should log the error message
    const errorMessage = "Oh No!";
    deps.nodeReader.getScripts.mockRejectedValueOnce(new Error(errorMessage));
    await expect(checkMonorepoScripts(monorepoDir)(deps)).rejects.toThrow(
      errorMessage,
    );
    expect(deps.logger.error).toBeCalledWith(errorMessage);

    // If promise fails with anything but Error, it should log a generic error message
    deps.nodeReader.getScripts.mockRejectedValueOnce(errorMessage);
    await expect(checkMonorepoScripts(monorepoDir)(deps)).rejects.toThrow(
      errorMessage,
    );
    expect(deps.logger.error).toBeCalledWith("Unknown error");
  });

  it("should log the success message", async () => {
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
    deps.nodeReader.getScripts.mockResolvedValueOnce(scripts);

    await checkMonorepoScripts(monorepoDir)(deps);
    expect(deps.logger.success).toHaveBeenCalledTimes(1);
  });

  it("should log the missing script error message", async () => {
    const deps = makeMockDependencies();

    deps.nodeReader.getScripts.mockResolvedValueOnce([]);

    await checkMonorepoScripts(monorepoDir)(deps);
    expect(deps.logger.error).toHaveBeenCalledWith(
      "Missing required scripts: code-review",
    );
  });
});
