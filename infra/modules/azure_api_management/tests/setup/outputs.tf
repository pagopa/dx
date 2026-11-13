output "resource_group_name" {
  value = data.azurerm_resource_group.rg.name
}

output "virtual_network_id" {
  value = data.azurerm_virtual_network.vnet.id
}

output "log_analytics_workspace_id" {
  value = data.azurerm_log_analytics_workspace.logs.id
}

output "tags" {
  value = local.tags
}

output "instance_numbers" {
  value = {
    development    = tostring(random_integer.instance_base.result)
    cost_optimized = tostring(random_integer.instance_base.result + 1)
  }
}
