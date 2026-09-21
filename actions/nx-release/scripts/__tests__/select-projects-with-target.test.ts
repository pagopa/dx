import { describe, expect, it } from "vitest";

import {
  parseSelectionInput,
  selectProjectsWithTarget,
} from "../select-projects-with-target.js";

describe("parseSelectionInput", () => {
  it("parses the target and requested project CSV", () => {
    expect(
      parseSelectionInput({
        projects: "dx-metrics, @pagopa/dx-mcpserver",
        target: "nx-release-publish",
      }),
    ).toEqual({
      projects: ["dx-metrics", "@pagopa/dx-mcpserver"],
      target: "nx-release-publish",
    });
  });

  it("rejects an empty requested-project CSV", () => {
    expect(() =>
      parseSelectionInput({
        projects: "",
        target: "build",
      }),
    ).toThrow("Invalid target selection input");
  });
});

describe("selectProjectsWithTarget", () => {
  it("returns all target-enabled projects when no projects are requested", () => {
    expect(
      selectProjectsWithTarget(["dx-metrics", "@pagopa/dx-mcpserver"]),
    ).toEqual(["dx-metrics", "@pagopa/dx-mcpserver"]);
  });

  it("intersects versioned projects with target-enabled projects", () => {
    expect(
      selectProjectsWithTarget(
        ["dx-metrics", "@pagopa/dx-mcpserver"],
        ["@pagopa/dx-mcpserver", "unpublishable-project"],
      ),
    ).toEqual(["@pagopa/dx-mcpserver"]);
  });

  it("accepts any Nx target name", () => {
    expect(
      parseSelectionInput({
        target: "custom-publisher",
      }),
    ).toEqual({
      target: "custom-publisher",
    });
  });
});
