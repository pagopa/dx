data "azurerm_application_insights" "this" {
  count = var.application_insights.id != null ? 1 : 0

  name                = provider::azurerm::parse_resource_id(var.application_insights.id).resource_name
  resource_group_name = provider::azurerm::parse_resource_id(var.application_insights.id).resource_group_name
}
