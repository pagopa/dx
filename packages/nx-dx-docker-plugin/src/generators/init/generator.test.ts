import { readJson } from "@nx/devkit";
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing";
import { describe, expect, it } from "vitest";

import initGenerator from "./generator.ts";

describe("initGenerator", () => {
  it("registers the Docker plugins in the required order", async () => {
    const tree = createTreeWithEmptyWorkspace();

    await initGenerator(tree);

    expect(readJson(tree, "nx.json").plugins).toEqual([
      {
        plugin: "@nx/docker",
        options: {
          buildTarget: "docker:build",
          runTarget: "docker:run",
        },
      },
      { plugin: "@pagopa/nx-dx-docker-plugin" },
    ]);
  });

  it("does not duplicate plugins already registered in nx.json", async () => {
    const tree = createTreeWithEmptyWorkspace();
    tree.write(
      "nx.json",
      JSON.stringify({ plugins: ["@nx/docker", "@pagopa/nx-dx-docker-plugin"] }),
    );

    await initGenerator(tree);

    expect(readJson(tree, "nx.json").plugins).toEqual([
      "@nx/docker",
      "@pagopa/nx-dx-docker-plugin",
    ]);
  });
});