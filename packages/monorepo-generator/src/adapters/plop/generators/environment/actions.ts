import { type DynamicActionsFunction } from "node-plop";
import * as path from "node:path";

import { payloadSchema } from "./prompts.js";

const actions: (templatesPath: string) => DynamicActionsFunction =
  (templatesPath) => (data) => {
    const payload = payloadSchema.parse(data);

    const actions = [
      {
        type: "getGitHubRepoName",
      },
      {
        type: "getTerraformBackend",
      },
      {
        dependencies: [
          {
            name: "hashicorp/azurerm",
            repository: {
              name: "terraform-provider-azurerm",
              owner: "hashicorp",
            },
            source: "release",
          },
          {
            name: "hashicorp/azuread",
            repository: {
              name: "terraform-provider-azuread",
              owner: "hashicorp",
            },
            source: "release",
          },
          {
            name: "pagopa-dx/azure",
            repository: {
              name: "terraform-provider-azure",
              owner: "pagopa-dx",
            },
            source: "release",
          },
          {
            name: "pagopa-dx/azure-github-environment-bootstrap/azurerm",
            repository: {
              name: "terraform-azurerm-azure-github-environment-bootstrap",
              owner: "pagopa-dx",
            },
            source: "tag",
          },
          {
            name: "pagopa-dx/azure-core-values-exporter/azurerm",
            repository: {
              name: "terraform-azurerm-azure-core-values-exporter",
              owner: "pagopa-dx",
            },
            source: "tag",
          },
          {
            name: "pagopa-dx/azure-core-infra/azurerm",
            repository: {
              name: "terraform-azurerm-azure-core-infra",
              owner: "pagopa-dx",
            },
            source: "tag",
          },
        ],
        type: "fetchTerraformVersions",
      },
      {
        base: path.join(templatesPath, "environment"),
        destination: "infra",
        force: true,
        templateFiles: path.join(templatesPath, "environment", "bootstrapper"),
        type: "addMany",
        verbose: true,
      },
    ];

    if (payload.init) {
      actions.unshift(
        {
          type: "initCloudAccounts",
        },
        {
          type: payload.init.terraformBackend
            ? "provisionTerraformBackend"
            : "getTerraformBackend",
        },
      );
      actions.push({
        base: path.join(templatesPath, "environment"),
        destination: "infra",
        force: true,
        templateFiles: path.join(templatesPath, "environment", "core"),
        type: "addMany",
        verbose: true,
      });
    }

    return actions;
  };

export default actions;
