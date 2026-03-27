output "container_app" {
  value       = module.container_app
  description = "Details of the Container App hosting the Next.js application."
}

output "postgres" {
  value       = module.postgres.postgres
  description = "Details of the PostgreSQL Flexible Server (name, ID, resource group)."
  sensitive   = true
}

output "import_job" {
  value = {
    id                  = azurerm_container_app_job.import.id
    name                = azurerm_container_app_job.import.name
    resource_group_name = azurerm_container_app_job.import.resource_group_name
  }
  description = "Details of the Container App Job running the scheduled metrics import task."
}
