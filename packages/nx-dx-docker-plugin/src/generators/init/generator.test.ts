import { readJson } from "@nx/devkit";
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing";
import { describe, expect, it } from "vitest";

import initGenerator from "./generator.ts";

describe("initGenerator", () => {
  it("registers the DX Docker plugin", async () => {
    const tree = createTreeWithEmptyWorkspace();

    await initGenerator(tree);

    expect(readJson(tree, "nx.json").plugins).toEqual([
      { plugin: "@pagopa/nx-dx-docker-plugin" },
    ]);
  });

  it("removes the upstream Docker plugin and preserves the DX plugin", async () => {
    const tree = createTreeWithEmptyWorkspace();
    tree.write(
      "nx.json",
      JSON.stringify({
        plugins: ["@nx/docker", "@pagopa/nx-dx-docker-plugin"],
      }),
    );

    await initGenerator(tree);

    expect(readJson(tree, "nx.json").plugins).toEqual([
      "@pagopa/nx-dx-docker-plugin",
    ]);
  });
});
