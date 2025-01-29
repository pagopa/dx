output "common_resource_group_name" {
  value = azurerm_resource_group.common.name
}

output "network_resource_group_name" {
  value = azurerm_resource_group.network.name
}

output "test_resource_group_name" {
  value = var.test_enabled ? azurerm_resource_group.test[0].name : null
}

output "github_runner" {
  value = {
    environment_id      = module.github_runner.cae_id
    resource_group_name = azurerm_resource_group.gh_runner.name
    subnet_id           = module.github_runner.subnet_id
  }
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

# Key Vault

output "common_key_vault" {
  value = {
    name                = module.key_vault.name
    id                  = module.key_vault.id
    resource_group_name = azurerm_resource_group.common.name
  }
}

# APIM

output "common_apim" {
  value = var.apim.enable ? {
    id                   = module.common_apim[0].id
    name                 = module.common_apim[0].name
    private_ip_addresses = module.common_apim[0].private_ip_addresses
    public_ip_addresses  = module.common_apim[0].public_ip_addresses
    gateway_url          = module.common_apim[0].gateway_url
    principal_id         = module.common_apim[0].principal_id
    resource_group_name  = azurerm_resource_group.common.name
  } : null
}

# Cosmos DB

output "common_cosmos" {
  value = var.cosmos.enable ? {
    id                  = module.common_cosmos[0].id
    name                = module.common_cosmos[0].name
    endpoint            = module.common_cosmos[0].endpoint
    read_endpoints      = module.common_cosmos[0].read_endpoints
    write_endpoints     = module.common_cosmos[0].write_endpoints
    resource_group_name = azurerm_resource_group.common.name
  } : null
}

# Storage

output "common_storage" {
  value = var.storage.enable ? {
    id                        = module.common_storage[0].id
    name                      = module.common_storage[0].name
    principal_id              = module.common_storage[0].principal_id
    primary_connection_string = module.common_storage[0].primary_connection_string
    primary_web_host          = module.common_storage[0].primary_web_host
    resource_group_name       = azurerm_resource_group.common.name
  } : null
}