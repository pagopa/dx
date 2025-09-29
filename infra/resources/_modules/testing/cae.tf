resource "azurerm_container_app_environment" "tests" {
  for_each = var.test_modes

  name = provider::dx::resource_name(
    merge(
      var.environment, {
        resource_type = "container_app_environment",
        name          = each.value
      }
  ))
  location            = azurerm_resource_group.tests[each.value].location
  resource_group_name = azurerm_resource_group.tests[each.value].name

  log_analytics_workspace_id = azurerm_log_analytics_workspace.tests[each.value].id

  infrastructure_subnet_id       = azurerm_subnet.cae_snets[each.value].id
  zone_redundancy_enabled        = false
  internal_load_balancer_enabled = false

  tags = var.tags
}
