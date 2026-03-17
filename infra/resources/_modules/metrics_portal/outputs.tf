output "container_app" {
  value       = module.container_app
  description = "Details of the Container App hosting the Next.js application."
}

output "postgres" {
  value       = module.postgres.postgres
  description = "Details of the PostgreSQL Flexible Server (name, ID, resource group)."
  sensitive   = true
}
