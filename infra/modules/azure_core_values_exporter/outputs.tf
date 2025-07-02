output "common_resource_group_name" {
  description = "The name of the common resource group."
  value       = data.terraform_remote_state.core.outputs.values.common_resource_group_name
}

output "common_resource_group_id" {
  description = "The ID of the common resource group."
  value       = data.terraform_remote_state.core.outputs.values.common_resource_group_id
}

output "network_resource_group_name" {
  description = "The name of the network resource group."
  value       = data.terraform_remote_state.core.outputs.values.network_resource_group_name
}

output "network_resource_group_id" {
  description = "The ID of the network resource group."
  value       = data.terraform_remote_state.core.outputs.values.network_resource_group_id
}


output "test_resource_group_name" {
  description = "The name of the test resource group (null if testing is disabled)."
  value       = data.terraform_remote_state.core.outputs.values.test_resource_group_name
}

output "test_resource_group_id" {
  description = "The ID of the test resource group (null if testing is disabled)."
  value       = data.terraform_remote_state.core.outputs.values.test_resource_group_id
}

output "opex_resource_group_name" {
  description = "The name of the OPEX resource group."
  value       = data.terraform_remote_state.core.outputs.values.opex_resource_group_name
}

output "opex_resource_group_id" {
  description = "The ID of the OPEX resource group."
  value       = data.terraform_remote_state.core.outputs.values.opex_resource_group_id
}

output "github_runner" {
  description = "Details of the GitHub runner, including environment ID, resource group name, and subnet ID."
  value = {
    environment_id      = data.terraform_remote_state.core.outputs.values.github_runner.environment_id
    resource_group_name = data.terraform_remote_state.core.outputs.values.github_runner.resource_group_name
    subnet_id           = data.terraform_remote_state.core.outputs.values.github_runner.subnet_id
  }
}

# Networking

output "common_vnet" {
  description = "Details of the common virtual network, including its name and ID."
  value = {
    name = data.terraform_remote_state.core.outputs.values.common_vnet.name
    id   = data.terraform_remote_state.core.outputs.values.common_vnet.id
  }
}

output "common_pep_snet" {
  description = "Details of the private endpoint subnet, including its name and ID."
  value = {
    name = data.terraform_remote_state.core.outputs.values.common_pep_snet.name
    id   = data.terraform_remote_state.core.outputs.values.common_pep_snet.id
  }
}

output "common_nat_gateways" {
  description = "A list of NAT gateways, including their IDs and names."
  value       = data.terraform_remote_state.core.outputs.values.common_nat_gateways
}

# Key Vault

output "common_key_vault" {
  description = "Details of the common Key Vault, including its name, ID, and resource group name."
  value = {
    name                = data.terraform_remote_state.core.outputs.values.common_key_vault.name
    id                  = data.terraform_remote_state.core.outputs.values.common_key_vault.id
    resource_group_name = data.terraform_remote_state.core.outputs.values.common_key_vault.resource_group_name
  }
}

# Log Analytics Workspace
output "common_log_analytics_workspace" {
  description = "Details of the common Log Analytics Workspace, including its ID, name, and workspace ID."
  value = {
    id           = data.terraform_remote_state.core.outputs.values.common_log_analytics_workspace.id
    name         = data.terraform_remote_state.core.outputs.values.common_log_analytics_workspace.name
    workspace_id = data.terraform_remote_state.core.outputs.values.common_log_analytics_workspace.workspace_id
  }
}
