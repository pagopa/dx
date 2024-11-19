output "common_resource_group_name" {
  value = azurerm_resource_group.common.name
}

output "network_resource_group_name" {
  value = azurerm_resource_group.network.name
}

output "test_resource_group_name" {
  value = var.test_enable ? azurerm_resource_group.test[0].name : null
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
  value = flatten([
    for ng in module.nat_gateway : [
      for nat_gateway in ng.nat_gateways : {
        id   = nat_gateway.id
        name = nat_gateway.name
      }
    ]
  ])
}