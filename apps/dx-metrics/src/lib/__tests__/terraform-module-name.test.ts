import { describe, expect, it } from "vitest";

import {
  aggregateTerraformModuleUsage,
  isDxTerraformModule,
  normalizeTerraformModuleName,
} from "../terraform-module-name.js";

describe("normalizeTerraformModuleName", () => {
  it("uses the registry module name", () => {
    expect(
      normalizeTerraformModuleName("pagopa-dx/azure-role-assignments/azurerm"),
    ).toBe("azure-role-assignments");
  });

  it("uses the repository name for git sources", () => {
    expect(
      normalizeTerraformModuleName(
        "git::https://github.com/terraform-aws-modules/terraform-aws-acm.git?ref=5d113fa07675fc42237907a621b68ac97109043e",
      ),
    ).toBe("terraform-aws-acm");
  });

  it("strips credentials from ssh sources", () => {
    expect(
      normalizeTerraformModuleName(
        "git::ssh://git@github.com/pagopa/terraform-azurerm-v3.git?ref=v1.2.3",
      ),
    ).toBe("terraform-azurerm-v3");
  });

  it("uses the repository name for bare github sources", () => {
    expect(normalizeTerraformModuleName("github.com/pagopa/io-infra")).toBe(
      "io-infra",
    );
  });

  it("uses the module directory when the source points inside a repository", () => {
    expect(
      normalizeTerraformModuleName(
        "github.com/pagopa/dx//infra/modules/azure_role_assignments?ref=main",
      ),
    ).toBe("azure-role-assignments");
    expect(
      normalizeTerraformModuleName(
        "git::https://example.com/repo.git//modules/storage-account?ref=v2",
      ),
    ).toBe("storage-account");
  });

  it("uses the module name for private registry sources", () => {
    expect(
      normalizeTerraformModuleName(
        "app.terraform.io/acme/storage-account/azurerm",
      ),
    ).toBe("storage-account");
  });

  it("canonicalises case and underscores", () => {
    expect(
      normalizeTerraformModuleName("pagopa-dx/Azure-Role-Assignments/azurerm"),
    ).toBe("azure-role-assignments");
    expect(normalizeTerraformModuleName("./modules/local")).toBe("local");
  });
});

describe("isDxTerraformModule", () => {
  it("recognises both registry and repository DX references", () => {
    expect(
      isDxTerraformModule("pagopa-dx/azure-role-assignments/azurerm"),
    ).toBe(true);
    expect(
      isDxTerraformModule(
        "github.com/pagopa/dx//infra/modules/azure_role_assignments?ref=main",
      ),
    ).toBe(true);
  });

  it("does not classify unrelated modules as DX", () => {
    expect(
      isDxTerraformModule(
        "git::https://github.com/terraform-aws-modules/terraform-aws-acm.git?ref=v1",
      ),
    ).toBe(false);
  });
});

describe("aggregateTerraformModuleUsage", () => {
  it("groups declarations by normalised name and counts repositories", () => {
    const rows = aggregateTerraformModuleUsage([
      {
        module: "pagopa-dx/azure-role-assignments/azurerm",
        repository: "pagopa/io-app",
      },
      {
        module: "pagopa-dx/azure-role-assignments/azurerm",
        repository: "pagopa/io-app",
      },
      {
        module:
          "git::https://github.com/pagopa/dx//infra/modules/azure_role_assignments?ref=main",
        repository: "pagopa/io-wallet",
      },
    ]);

    expect(rows).toEqual([
      {
        module: "azure-role-assignments",
        moduleType: "DX",
        repositoryCount: 2,
        sources: [
          "pagopa-dx/azure-role-assignments/azurerm",
          "git::https://github.com/pagopa/dx//infra/modules/azure_role_assignments",
        ],
        usageCount: 3,
      },
    ]);
  });

  it("orders sources by how often they are used", () => {
    const rows = aggregateTerraformModuleUsage([
      {
        module: "github.com/pagopa/dx//infra/modules/azure_function_app",
        repository: "pagopa/a",
      },
      {
        module: "pagopa-dx/azure-function-app/azurerm",
        repository: "pagopa/b",
      },
      {
        module: "pagopa-dx/azure-function-app/azurerm",
        repository: "pagopa/c",
      },
    ]);

    // The most-used expression is first because it is the one the UI links to.
    expect(rows[0].sources).toEqual([
      "pagopa-dx/azure-function-app/azurerm",
      "github.com/pagopa/dx//infra/modules/azure_function_app",
    ]);
  });

  it("merges different sources that share a normalised name", () => {
    const rows = aggregateTerraformModuleUsage([
      {
        module:
          "git::https://github.com/terraform-aws-modules/terraform-aws-acm.git?ref=v1",
        repository: "pagopa/io-app",
      },
      {
        module:
          "git::https://github.com/terraform-aws-modules/terraform-aws-acm.git?ref=v2",
        repository: "pagopa/io-wallet",
      },
    ]);

    expect(rows).toEqual([
      {
        module: "terraform-aws-acm",
        moduleType: "Non-DX",
        repositoryCount: 2,
        sources: [
          "git::https://github.com/terraform-aws-modules/terraform-aws-acm.git",
        ],
        usageCount: 2,
      },
    ]);
  });

  it("keeps a DX and a non-DX module with the same short name separate", () => {
    const rows = aggregateTerraformModuleUsage([
      {
        module: "pagopa-dx/storage-account/azurerm",
        repository: "pagopa/io-app",
      },
      {
        module: "git::https://github.com/example/storage-account.git?ref=v1",
        repository: "pagopa/io-wallet",
      },
    ]);

    expect(rows).toEqual([
      {
        module: "storage-account",
        moduleType: "DX",
        repositoryCount: 1,
        sources: ["pagopa-dx/storage-account/azurerm"],
        usageCount: 1,
      },
      {
        module: "storage-account",
        moduleType: "Non-DX",
        repositoryCount: 1,
        sources: ["git::https://github.com/example/storage-account.git"],
        usageCount: 1,
      },
    ]);
  });

  it("sorts by repository spread and then by name", () => {
    const rows = aggregateTerraformModuleUsage([
      {
        module: "pagopa-dx/b-module/azurerm",
        repository: "pagopa/io-app",
      },
      {
        module: "pagopa-dx/a-module/azurerm",
        repository: "pagopa/io-app",
      },
      {
        module: "pagopa-dx/a-module/azurerm",
        repository: "pagopa/io-wallet",
      },
    ]);

    expect(rows.map((row) => row.module)).toEqual(["a-module", "b-module"]);
  });
});
