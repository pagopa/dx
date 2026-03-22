import { describe, expect, it } from "vitest";

import { resolveImportSettings } from "../config.js";

describe("resolveImportSettings", () => {
  it("keeps dxTeamSlug from the config file", () => {
    const settings = resolveImportSettings(
      { dxTeamSlug: "engineering-team-devex" },
      {},
    );

    expect(settings.dxTeamSlug).toBe("engineering-team-devex");
  });

  it("applies defaults for dxRepo, organization, and repositories", () => {
    const settings = resolveImportSettings(
      { dxTeamSlug: "engineering-team-devex" },
      {},
    );

    expect(settings.dxRepo).toBe("dx");
    expect(settings.organization).toBe("pagopa");
    expect(settings.repositories).toEqual([]);
  });
});
