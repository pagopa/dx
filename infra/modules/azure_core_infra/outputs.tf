output "common_resource_group_name" {
  description = "The name of the common resource group."
  value       = azurerm_resource_group.common.name
}

output "network_resource_group_name" {
  description = "The name of the network resource group."
  value       = azurerm_resource_group.network.name
}

output "test_resource_group_name" {
  description = "The name of the test resource group (null if testing is disabled)."
  value       = var.test_enabled ? azurerm_resource_group.test[0].name : null
}

output "github_runner" {
  description = "Details of the GitHub runner, including environment ID, resource group name, and subnet ID."
  value = {
    environment_id      = module.github_runner.cae_id
    resource_group_name = azurerm_resource_group.gh_runner.name
    subnet_id           = module.github_runner.subnet_id
  }
}

# Networking

output "common_vnet" {
  description = "Details of the common virtual network, including its name and ID."
  value = {
    name = module.network.vnet.name
    id   = module.network.vnet.id
  }
}

output "common_pep_snet" {
  description = "Details of the private endpoint subnet, including its name and ID."
  value = {
    name = module.network.pep_snet.name
    id   = module.network.pep_snet.id
  }
}

output "common_nat_gateways" {
  description = "A list of NAT gateways, including their IDs and names."
  value = flatten([
    for ng in module.nat_gateway : [
      for nat_gateway in ng.nat_gateways : {
        id   = nat_gateway.id
        name = nat_gateway.name
      }
    ]
  ])
}

# Key Vault

output "common_key_vault" {
  description = "Details of the common Key Vault, including its name, ID, and resource group name."
  value = {
    name                = module.key_vault.name
    id                  = module.key_vault.id
    resource_group_name = azurerm_resource_group.common.name
  }
}