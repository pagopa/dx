data "aws_caller_identity" "current" {}

data "azurerm_application_insights" "this" {
  name                = module.azure_core_values.application_insights.name
  resource_group_name = module.azure_core_values.application_insights.resource_group_name
}
