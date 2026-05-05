output "subscription_id" {
  description = "The ID of the Azure subscription."
  value       = data.azurerm_subscription.current.id
}

output "tenant_id" {
  description = "The ID of the Azure tenant."
  value       = data.azurerm_subscription.current.tenant_id
}

output "common_resource_group_name" {
  description = "The name of the common resource group."
  value       = local.values.common_resource_group_name
}

output "common_resource_group_id" {
  description = "The ID of the common resource group."
  value       = local.values.common_resource_group_id
}

output "network_resource_group_name" {
  description = "The name of the network resource group."
  value       = local.values.network_resource_group_name
}

output "network_resource_group_id" {
  description = "The ID of the network resource group."
  value       = local.values.network_resource_group_id
}


output "test_resource_group_name" {
  description = "The name of the test resource group (null if testing is disabled)."
  value       = local.values.test_resource_group_name
}

output "test_resource_group_id" {
  description = "The ID of the test resource group (null if testing is disabled)."
  value       = local.values.test_resource_group_id
}

output "opex_resource_group_name" {
  description = "The name of the OPEX resource group."
  value       = local.values.opex_resource_group_name
}

output "opex_resource_group_id" {
  description = "The ID of the OPEX resource group."
  value       = local.values.opex_resource_group_id
}

output "github_runner" {
  description = "Details of the GitHub runner, including environment ID, resource group name, and subnet ID."
  value = {
    environment_id      = local.values.github_runner.environment_id
    resource_group_name = local.values.github_runner.resource_group_name
    subnet_id           = local.values.github_runner.subnet_id
  }
}

# Networking

output "common_vnet" {
  description = "Details of the common virtual network, including its name and ID."
  value = {
    name = local.values.common_vnet.name
    id   = local.values.common_vnet.id
  }
}

output "common_pep_snet" {
  description = "Details of the private endpoint subnet, including its name and ID."
  value = {
    name = local.values.common_pep_snet.name
    id   = local.values.common_pep_snet.id
  }
}

output "common_test_snet" {
  description = "Details of the test subnet, including its name and ID."
  value = {
    name = local.values.common_test_snet.name
    id   = local.values.common_test_snet.id
  }
}

output "common_vpn_snet" {
  description = "Details of the VPN subnet, including its name and ID."
  value = {
    name = local.values.common_vpn_snet.name
    id   = local.values.common_vpn_snet.id
  }
}

output "common_nat_gateways" {
  description = "A list of NAT gateways, including their IDs and names."
  value       = local.values.common_nat_gateways
}

output "vpn_gateway_id" {
  description = "The ID of the virtual network gateway."
  value       = local.values.vpn_gateway_id
}

output "vpn_fqdns" {
  description = "The fqdn for virtual network gateway."
  value       = local.values.vpn_fqdns
}

output "vpn_public_ips" {
  description = "The public IP addresses associated with the virtual network gateway."
  value       = local.values.vpn_public_ips
}

# Key Vault

output "common_key_vault" {
  description = "Details of the common Key Vault, including its name, ID, and resource group name."
  value = {
    name                = local.values.common_key_vault.name
    id                  = local.values.common_key_vault.id
    resource_group_name = local.values.common_key_vault.resource_group_name
  }
}

# Log Analytics Workspace
output "common_log_analytics_workspace" {
  description = "Details of the common Log Analytics Workspace, including its ID, name, and workspace ID."
  value = {
    id           = local.values.common_log_analytics_workspace.id
    name         = local.values.common_log_analytics_workspace.name
    workspace_id = local.values.common_log_analytics_workspace.workspace_id
  }
}

output "application_insights" {
  description = "Details of the Application Insights instance, including its ID, name, and instrumentation key."
  value = {
    id                                 = local.values.application_insights.id
    name                               = local.values.application_insights.name
    instrumentation_key_kv_secret_id   = local.values.application_insights.instrumentation_key_kv_secret_id
    instrumentation_key_kv_secret_name = local.values.application_insights.instrumentation_key_kv_secret_name
    resource_group_name                = local.values.application_insights.resource_group_name
  }
}

output "dns_forwarder" {
  value = {
    endpoint            = try(local.values.dns_forwarder.endpoint, null)
    subnet_id           = try(local.values.dns_forwarder.subnet_id, null)
    private_ip          = try(local.values.dns_forwarder.private_ip, null)
    resource_group      = try(local.values.dns_forwarder.resource_group, null)
    cross_cloud_enabled = try(local.values.dns_forwarder.cross_cloud_enabled, false)
  }
}

output "private_dns_zones" {
  description = "List of private DNS zones linked to the virtual network."
  value       = try(local.values.private_dns_zones, [])
}
