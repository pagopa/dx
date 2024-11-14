output "common_resource_group_name" {
  value = azurerm_resource_group.common.name
}

# Networking

output "common_vnet" {
  value = {
    name = module.network.vnet.name
    id   = module.network.vnet.id
  }
}

output "common_pep_snet" {
  value = {
    name = module.network.pep_snet.name
    id   = module.network.pep_snet.id
  }
}

output "common_nat_gateways" {
  value = [for ng in range(length(module.network.nat_gateways)) : {
    id   = module.network.nat_gateways[ng].id
    name = module.network.nat_gateways[ng].name
  }]
}