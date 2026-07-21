import { describe, expect, it } from "vitest";

import { addCommentMarker } from "../index.js";
import { buildResponsesRequest } from "../prompt.js";

describe("buildResponsesRequest", () => {
  it("uses the DX skill as instructions and includes the MCP context in the user input", () => {
    const request = buildResponsesRequest(
      {
        azureMcpContext: "Status: collected. Live role assignments follow.",
        cdIdentityName: "dx-d-itn-infra-cd-id-01",
        planText: "# azurerm_resource_group.example will be created",
        skillText: "# Terraform CD Permission Check",
        workingDirectory: "infra/resources/dev",
      },
      "gpt-5-5",
    );

    expect(request).toEqual({
      input: expect.stringContaining(
        "Status: collected. Live role assignments follow.",
      ),
      instructions: "# Terraform CD Permission Check",
      model: "gpt-5-5",
    });
    expect(request.input).toContain("dx-d-itn-infra-cd-id-01");
    expect(request.input).toContain("azurerm_resource_group.example");
  });
});

describe("addCommentMarker", () => {
  it("adds the workflow's per-directory PR comment marker", () => {
    expect(
      addCommentMarker(
        "## Terraform CD Permission Check",
        "infra/resources/dev",
      ),
    ).toBe(
      "<!-- Terraform Permission Check (infra/resources/dev) -->\n\n## Terraform CD Permission Check",
    );
  });
});
