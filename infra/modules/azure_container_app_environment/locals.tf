locals {
  tags = merge(var.tags, { ModuleSource = "DX", ModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"), ModuleName = try(jsondecode(file("${path.module}/package.json")).name, "unknown") })

  use_cases = {
    default = {
      zone_redundancy_enabled = true
      lock_enabled            = true
    }
    development = {
      zone_redundancy_enabled = false
      lock_enabled            = false
    }
  }

  use_case_features = local.use_cases[var.use_case]

  vnet_id       = provider::azurerm::normalise_resource_id("${data.azurerm_subscription.current.id}/resourceGroups/${var.networking.virtual_network.resource_group_name}/providers/Microsoft.Network/virtualNetworks/${var.networking.virtual_network.name}")
  subnet_pep_id = provider::azurerm::normalise_resource_id("${local.vnet_id}/subnets/${local.pep_subnet_name}")
  pep_subnet_name = provider::dx::resource_name(merge(var.environment, {
    domain          = "",
    app_name        = "pep",
    resource_type   = "subnet"
    instance_number = "01"
  }))

  pep_name = provider::dx::resource_name(merge(var.environment, { resource_type = "container_app_private_endpoint" }))
}
