output "rg_name" {
  value = azurerm_resource_group.plan_test.name
}

output "rg_location" {
  value = azurerm_resource_group.plan_test.location
}

output "tags" {
  value = local.tags
}
