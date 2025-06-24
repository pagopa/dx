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
    expect(deps.writer.write).toBeCalledWith(`❌ ${errorMessage}`);

    // If promise fails with anything but Error, it should log a generic error message
    deps.nodeReader.getScripts.mockRejectedValueOnce(errorMessage);
    await expect(checkMonorepoScripts(monorepoDir)(deps)).rejects.toThrow(
      errorMessage,
    );
    expect(deps.writer.write).toBeCalledWith("❌ Unknown error");
  });

  it("should log the message", async () => {
    const deps = makeMockDependencies();

    const scripts = [
      {
        name: "lint",
        script: "eslint .",
      },
    ] as Script[];
    deps.nodeReader.getScripts.mockResolvedValueOnce(scripts);

    await checkMonorepoScripts(monorepoDir)(deps);
    expect(deps.writer.write).toHaveBeenCalledWith(
      `❌ Script "code-review" is missing in the monorepo root`,
    );
  });
});
