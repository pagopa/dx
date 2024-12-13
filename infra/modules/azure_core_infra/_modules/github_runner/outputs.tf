output "subnet_name" {
  value       = azurerm_subnet.runner_snet.name
  description = "Subnet name"
}

output "subnet_id" {
  value       = azurerm_subnet.runner_snet.id
  description = "Subnet id"
}

output "cae_id" {
  value       = azurerm_container_app_environment.cae.id
  description = "Container App Environment id"
}

output "cae_name" {
  value       = azurerm_container_app_environment.cae.name
  description = "Container App Environment name"
}

output "ca_job_id" {
  value       = azurerm_container_app_job.container_app_job.id
  description = "Container App job id"
}

output "ca_job_name" {
  value       = azurerm_container_app_job.container_app_job.name
  description = "Container App job name"
}
