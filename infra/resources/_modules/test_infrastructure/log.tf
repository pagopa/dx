resource "azurerm_log_analytics_workspace" "tests" {
  for_each = var.tests_kind

  name = provider::dx::resource_name(
    merge(
      var.environment,
      {
        resource_type = "log_analytics",
        name          = each.value
      }
  ))
  location            = var.environment.location
  resource_group_name = azurerm_resource_group.tests[each.value].name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = var.tags
}
