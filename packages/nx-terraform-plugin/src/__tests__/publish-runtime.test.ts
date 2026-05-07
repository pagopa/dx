import { describe, expect, it } from "vitest";

import { runPublish, runPublishFromProcessArgs } from "../publish/runtime.ts";

describe("runPublish", () => {
  it("derives the repository name from provider and module root", async () => {
    await expect(
      runPublish({
        projectRoot: "infra/modules/azure_core_infra",
        publish: {
          github: {
            owner: "pagopa-dx",
          },
          mode: "github",
        },
        workspaceRoot: "/repo",
      }),
    ).resolves.toEqual({
      repo: "terraform-azurerm-azure-core-infra",
    });
  });
});

describe("runPublishFromProcessArgs", () => {
  it("parses CLI args into a publish runtime input", async () => {
    await expect(
      runPublishFromProcessArgs(
        [
          "--projectRoot=infra/modules/azure_core_infra",
          "--workspaceRoot=/repo",
        ],
        "/repo",
      ),
    ).resolves.toEqual({
      repo: "terraform-azurerm-azure-core-infra",
    });
  });
});
