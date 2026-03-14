output "app_service" {
  value       = module.app_service.app_service
  description = "Details of the App Service hosting the Next.js application."
}

output "postgres" {
  value       = module.postgres.postgres
  description = "Details of the PostgreSQL Flexible Server (name, ID, resource group)."
  sensitive   = true
}
