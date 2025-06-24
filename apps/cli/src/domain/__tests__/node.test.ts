import { describe, expect, it } from "vitest";

import { Script, checkMonorepoScripts } from "../node.js";
import { makeMockDependencies } from "./data.js";

describe("checkMonorepoScripts", () => {
  const monorepoDir = "/path/to/monorepo";

  it("should log the error", async () => {
    const deps = makeMockDependencies();

    const errorMessage = "Oh No!";
    deps.nodeReader.getScripts.mockRejectedValueOnce(new Error(errorMessage));

    await expect(checkMonorepoScripts(monorepoDir)(deps)).rejects.toThrow(
      errorMessage,
    );
    expect(deps.writer.write).toBeCalledWith(`❌ ${errorMessage}`);
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
