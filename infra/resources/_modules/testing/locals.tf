locals {
  pep_subnet_name = provider::dx::resource_name(
    merge(
      var.environment,
      {
        resource_type = "subnet",
        name          = "pep",
      }
  ))

  common_subnets = [var.runner_subnet_name]
  tests_subnets  = [local.pep_subnet_name] # same subnet name for both vnets

  subnet_names_by_id = { for subnet_id in var.vnet_common.subnet_ids : subnet_id => provider::azurerm::parse_resource_id(subnet_id)["resource_name"] }
  subnets_to_associate = {
    for subnet_id, subnet_name in local.subnet_names_by_id : subnet_id => subnet_name
    if !contains([var.runner_subnet_name, "GatewaySubnet"], subnet_name)
  }

  vnet_address_space_by_mode = { for mode_key, mode_value in var.test_modes : mode_key => format("10.%d.0.0/16", 20 + index(tolist(var.test_modes), mode_key)) }
}
