# Example root Terraform module (Function App, Storage, CosmosDB)

This example demonstrates a minimal root Terraform configuration to provision:
- an Azure Function App (Node.js)
- an Azure Storage Account
- an Azure Cosmos DB account

Design choices were taken following PagoPA DX Terraform guidance:
- Use a consistent infra folder structure and standard file layout (locals.tf, providers.tf, variables.tf, outputs.tf) as described in https://dx.pagopa.it/docs/terraform/infra-folder-structure and https://dx.pagopa.it/docs/terraform/code-style
- Apply mandatory resource tags using the required-tags guidance: https://dx.pagopa.it/docs/terraform/required-tags
- Use the DX provider helper for resource naming as shown in DX examples (provider::dx::resource_name) referenced in the DX code-style docs

Files in this folder:
- versions.tf: Terraform required version
- providers.tf: provider and backend configuration (azurerm + dx)
- variables.tf: input variables including environment object and node version
- locals.tf: naming_config and standard tags per DX guidance
- main.tf: resources (resource group, storage account, cosmosdb account, app service plan, function app)
- outputs.tf: useful outputs

Notes and sources
- All guidance used to create this example was retrieved from PagoPA DX Terraform documentation pages on https://dx.pagopa.it/docs/terraform/ using fetch_webpage. Key pages consulted include:
  - https://dx.pagopa.it/docs/terraform/using-terraform-registry-modules
  - https://dx.pagopa.it/docs/terraform/infra-folder-structure
  - https://dx.pagopa.it/docs/terraform/code-style
  - https://dx.pagopa.it/docs/terraform/required-tags

This example is intentionally minimal and intended as a starting point; adapt SKUs, replication, and regional configuration for production requirements.
