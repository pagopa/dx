module "azure_core_values" {
  source  = "pagopa-dx/azure-core-values-exporter/azurerm"
  version = "~> 0.0"

  core_state = local.core_state
}

module "ai_foundry" {
  source = "../_modules/ai_foundry"

  environment         = merge(local.environment, { app_name = "ai" })
  resource_group_name = data.azurerm_resource_group.ai.name

  virtual_network = {
    id                  = data.azurerm_virtual_network.common.id
    name                = data.azurerm_virtual_network.common.name
    resource_group_name = data.azurerm_virtual_network.common.resource_group_name
  }

  private_endpoint_subnet_id = module.azure_core_values.common_pep_snet.id

  tags = local.tags
}

module "ai_gateway" {
  source = "../_modules/ai_gateway"

  environment         = merge(local.environment, { app_name = "ai" })
  resource_group_name = data.azurerm_resource_group.ai.name

  virtual_network = {
    id                  = data.azurerm_virtual_network.common.id
    name                = data.azurerm_virtual_network.common.name
    resource_group_name = data.azurerm_virtual_network.common.resource_group_name
  }

  application_insights = {
    id                = data.azurerm_application_insights.this.id
    connection_string = data.azurerm_application_insights.this.connection_string
  }

  foundry = {
    project_id            = module.ai_foundry.project_id
    project_endpoint      = module.ai_foundry.project_endpoint
    model_deployment_name = module.ai_foundry.model_deployment_name
  }

  tags = local.tags
}
