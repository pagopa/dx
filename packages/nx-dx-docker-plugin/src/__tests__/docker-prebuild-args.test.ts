import { describe, expect, it } from "vitest";

import { parseDockerProjectsFilter } from "../docker-prebuild-args.ts";

describe("parseDockerProjectsFilter", () => {
  it("expands comma and whitespace-separated project filters", () => {
    expect(
      parseDockerProjectsFilter("project-one,project-two project-three"),
    ).toEqual(["project-one", "project-two", "project-three"]);
  });

  it("preserves supported Nx project patterns", () => {
    expect(parseDockerProjectsFilter("@pagopa/app-* infra/apps/*")).toEqual([
      "@pagopa/app-*",
      "infra/apps/*",
    ]);
  });

  it("rejects unsupported command-line characters", () => {
    expect(() => parseDockerProjectsFilter("project-one;echo")).toThrow(
      "must be a comma/space-separated list of project names or patterns",
    );
  });
});
