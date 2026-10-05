/** This module verifies that tracked repository tool markers map to Tech Radar entries. */

import { afterEach, describe, expect, it, vi } from "vitest";

import { loadTechRadarTools } from "../tech-radar-catalog.js";

const radarEntries = [
  "pnpm",
  "npm",
  "turborepo",
  "changeset",
  "nx",
  "yarn-classic",
  "mise",
].map((slug) => ({
  description: `${slug} description`,
  ref: `https://dx.pagopa.it/radar/${slug}`,
  ring: "adopt" as const,
  slug,
  tags: ["tool"],
  title: slug,
}));

describe("loadTechRadarTools", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects mise configuration files as an adopted Tech Radar tool", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => radarEntries,
        ok: true,
        status: 200,
        statusText: "OK",
      }),
    );

    const tools = await loadTechRadarTools();

    expect(tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "mise",
          path: "mise.toml",
          radarRing: "adopt",
          radarSlug: "mise",
          radarStatus: "aligned",
          toolName: "mise",
        }),
      ]),
    );
  });
});
