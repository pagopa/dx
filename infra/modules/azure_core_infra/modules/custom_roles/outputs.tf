output "dx_app_ci_resource_group_reader" {
  description = "The merged custom role name for the App CI resource group reader role."
  value       = module.dx_app_ci_resource_group_reader.custom_role_name
}

output "dx_infra_ci_subscription_reader" {
  description = "The merged custom role name for the Infra CI subscription reader role."
  value       = module.dx_infra_ci_subscription_reader.custom_role_name
}

output "dx_infra_cd_subscription_admin" {
  description = "The merged custom role name for the Infra CD subscription admin role."
  value       = module.dx_infra_cd_subscription_admin.custom_role_name
}

output "dx_function_host_storage" {
  description = "The merged custom role name for the Function App host storage role."
  value       = module.dx_function_host_storage.custom_role_name
}

output "dx_function_durable_storage" {
  description = "The merged custom role name for the Function App durable storage role."
  value       = module.dx_function_durable_storage.custom_role_name
}
