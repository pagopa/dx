data "azurerm_virtual_network" "common" {
  name = provider::azuredx::resource_name({
    prefix          = local.environment.prefix
    environment     = local.environment.env_short
    location        = local.environment.location
    instance_number = local.environment.instance_number
    resource_type   = "virtual_network"
    name            = "common"
  })
  resource_group_name = provider::azuredx::resource_name({
    prefix          = local.environment.prefix
    environment     = local.environment.env_short
    location        = local.environment.location
    instance_number = local.environment.instance_number
    resource_type   = "resource_group"
    name            = "network"
  })
}

data "aws_caller_identity" "current" {}

data "azurerm_resource_group" "dx" {
  name = provider::azuredx::resource_name({
    prefix          = local.environment.prefix
    environment     = local.environment.env_short
    location        = local.environment.location
    instance_number = local.environment.instance_number
    resource_type   = "resource_group"
    name            = "devex"
  })
}

data "azurerm_application_insights" "this" {
  name                = module.azure_core_values.application_insights.name
  resource_group_name = module.azure_core_values.application_insights.resource_group_name
}
