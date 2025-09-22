output "common_resource_group_name" {
  description = "The name of the common resource group."
  value       = azurerm_resource_group.common.name
}

output "common_resource_group_id" {
  description = "The ID of the common resource group."
  value       = azurerm_resource_group.common.id
}

output "network_resource_group_name" {
  description = "The name of the network resource group."
  value       = azurerm_resource_group.network.name
}

output "network_resource_group_id" {
  description = "The ID of the network resource group."
  value       = azurerm_resource_group.network.id
}


output "test_resource_group_name" {
  description = "The name of the test resource group (null if testing is disabled)."
  value       = var.test_enabled ? azurerm_resource_group.test[0].name : null
}

output "test_resource_group_id" {
  description = "The ID of the test resource group (null if testing is disabled)."
  value       = var.test_enabled ? azurerm_resource_group.test[0].id : null
}

output "opex_resource_group_name" {
  description = "The name of the OPEX resource group."
  value       = azurerm_resource_group.opex.name
}

output "opex_resource_group_id" {
  description = "The ID of the OPEX resource group."
  value       = azurerm_resource_group.opex.id
}

output "github_runner" {
  description = "Details of the GitHub runner, including environment ID, resource group name, and subnet ID."
  value = {
    environment_id      = module.github_runner.cae_id
    resource_group_name = azurerm_resource_group.gh_runner.name
    subnet_id           = module.network.runner_snet.id
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

output "common_test_snet" {
  description = "Details of the test subnet, including its name and ID."
  value = {
    name = module.network.test_snet.name
    id   = module.network.test_snet.id
  }
}

output "common_vpn_snet" {
  description = "Details of the VPN subnet, including its name and ID."
  value = {
    name = module.network.vpn_snet.name
    id   = module.network.vpn_snet.id
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

output "vpn_gateway_id" {
  description = "The ID of the virtual network gateway."
  value       = var.vpn_enabled || var.cross_cloud_dns_enabled ? module.vpn[0].gateway_id : null
}

output "vpn_fqdns" {
  description = "The FQDNs for virtual network gateway."
  value       = var.vpn_enabled || var.cross_cloud_dns_enabled ? module.vpn[0].fqdns : null
}

output "vpn_public_ips" {
  description = "The public IP addresses associated with the virtual network gateway."
  value       = var.vpn_enabled || var.cross_cloud_dns_enabled ? module.vpn[0].public_ips : null
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

# Log Analytics Workspace
output "common_log_analytics_workspace" {
  description = "Details of the common Log Analytics Workspace, including its ID, name, and workspace ID."
  value = {
    id           = module.common_log_analytics.id
    name         = module.common_log_analytics.name
    workspace_id = module.common_log_analytics.workspace_id
  }
}

output "application_insights" {
  description = "Details of the Application Insights instance, including its ID, name, and instrumentation key."
  value = {
    id                                 = module.application_insights.id
    name                               = module.application_insights.name
    instrumentation_key_kv_secret_id   = module.application_insights.instrumentation_key_kv_secret_id
    instrumentation_key_kv_secret_name = module.application_insights.instrumentation_key_kv_secret_name
    resource_group_name                = module.application_insights.resource_group_name
  }
}

# DNS Forwarder
output "dns_forwarder" {
  description = "DNS forwarder configuration and endpoints"
  value = {
    endpoint            = (var.vpn_enabled || var.cross_cloud_dns_enabled) ? module.vpn[0].dns_forwarder_endpoint : null
    subnet_id           = (var.vpn_enabled || var.cross_cloud_dns_enabled) ? module.network.dns_forwarder_snet.id : null
    private_ip          = (var.vpn_enabled || var.cross_cloud_dns_enabled) ? module.vpn[0].dns_forwarder_private_ip : null
    resource_group      = (var.vpn_enabled || var.cross_cloud_dns_enabled) ? azurerm_resource_group.network.name : null
    cross_cloud_enabled = var.cross_cloud_dns_enabled
  }
}

output "private_dns_zones" {
  description = "List of private DNS zones linked to the virtual network."
  value       = values(local.private_dns_zones)
}