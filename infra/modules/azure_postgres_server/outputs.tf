
output "private_endpoint" {

  value       = azurerm_private_endpoint.postgre_pe.id
  description = "Subnet ID in which to create the PostgreSQL Flexible Server Replica"
}

output "postgres" {
  value = {
    name = azurerm_postgresql_flexible_server.this.name
    id   = azurerm_postgresql_flexible_server.this.id
  }
  description = "PostgreSQL Flexible Server"
}

output "private_endpoint_replica" {

  value       = var.tier == "premium" ? azurerm_private_endpoint.replica_postgre_pe[0].id : null
  description = "Subnet ID in which to create the PostgreSQL Flexible Server Replica"
}

output "postgres_replica" {
  value = var.tier == "premium" ? {
    name = azurerm_postgresql_flexible_server.replica[0].name
    id   = azurerm_postgresql_flexible_server.replica[0].id
  } : {}
  description = "PostgreSQL Flexible Server Replica"
}
