/**
 * Verifies the monorepo scaffold ships the recommended Copilot marketplace
 * settings for PagoPA DX plugin discovery.
 */
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const copilotSettingsTemplateUrl = new URL(
  "../../../../../../templates/monorepo/.github/copilot/settings.json.hbs",
  import.meta.url,
);

describe("copilot settings template", () => {
  it("includes the recommended DX marketplace and plugin set", async () => {
    const template = await readFile(copilotSettingsTemplateUrl, "utf8");
    const settings = JSON.parse(template);

    expect(settings).toEqual({
      enabledPlugins: {
        "azure@pagopa-dx": true,
        "project-management@pagopa-dx": true,
        "standards@pagopa-dx": true,
        "terraform@pagopa-dx": true,
        "typescript@pagopa-dx": true,
      },
      extraKnownMarketplaces: {
        "pagopa-dx": {
          source: {
            repo: "pagopa/dx",
            source: "github",
          },
        },
      },
    });
  });
});
