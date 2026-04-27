locals {
  tags = merge(var.tags, { ModuleSource = "DX", ModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"), ModuleName = try(jsondecode(file("${path.module}/package.json")).name, "unknown") })

  use_cases = {
    default = {
      zone_redundancy_enabled  = true
      lock_enabled             = true
      cae_subnet_prefix_length = 23
    }
    development = {
      zone_redundancy_enabled  = false
      lock_enabled             = false
      cae_subnet_prefix_length = 27
    }
  }

  use_case_features = local.use_cases[var.use_case]

  vnet_id                  = provider::azurerm::normalise_resource_id(var.networking.virtual_network_id)
  parsed_vnet              = provider::azurerm::parse_resource_id(local.vnet_id)
  vnet_name                = local.parsed_vnet.resource_name
  vnet_resource_group_name = local.parsed_vnet.resource_group_name
  vnet_instance_number     = element(split("-", local.vnet_name), length(split("-", local.vnet_name)) - 1)

  private_dns_zone_id = var.networking.public_network_access_enabled ? null : try(data.azurerm_private_dns_zone.this[0].id, null)

  subnet_pep_id = provider::azurerm::normalise_resource_id("${local.vnet_id}/subnets/${local.pep_subnet_name}")
  pep_subnet_name = provider::dx::resource_name(merge(var.environment, {
    domain          = "",
    app_name        = "pep",
    resource_type   = "subnet"
    instance_number = local.vnet_instance_number
  }))

  pep_name = provider::dx::resource_name(merge(var.environment, { resource_type = "container_app_private_endpoint" }))
}
