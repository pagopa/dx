resource "dx_available_subnet_cidr" "apim" {
  provider           = azuredx
  virtual_network_id = var.virtual_network.id
  prefix_length      = 27
}

resource "azurerm_subnet" "apim" {
  name = provider::azuredx::resource_name(merge(var.environment,
    {
      resource_type = "apim_subnet",
  }))
  resource_group_name  = var.virtual_network.resource_group_name
  virtual_network_name = var.virtual_network.name
  address_prefixes     = [dx_available_subnet_cidr.apim.cidr_block]
}

module "apim" {
  source  = "pagopa-dx/azure-api-management/azurerm"
  version = "~> 2.1"

  environment = merge(var.environment, {
    app_name  = "ai",
    env_short = var.environment.environment,
  })
  resource_group_name = var.resource_group_name
  use_case            = "development"

  publisher_name  = "PagoPA S.p.A."
  publisher_email = "team-devex@pagopa.it"

  virtual_network = {
    name                = var.virtual_network.name
    resource_group_name = var.virtual_network.resource_group_name
  }

  subnet_id                     = azurerm_subnet.apim.id
  virtual_network_type_internal = true
  enable_public_network_access  = true

  application_insights = {
    enabled             = true
    id                  = var.application_insights.id
    connection_string   = var.application_insights.connection_string
    sampling_percentage = 100
    verbosity           = "information"
  }

  tags = var.tags
}

resource "azurerm_role_assignment" "apim_foundry" {
  scope                = var.foundry.project_id
  role_definition_name = "Foundry User" # Azure AI User
  principal_id         = module.apim.principal_id
  description          = "Allow the AI gateway (APIM) managed identity to invoke Foundry project models via Entra ID"
}
