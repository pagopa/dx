
output "private_endpoint" {
  value       = azurerm_private_endpoint.postgre_pep.id
  description = "Private Endpoint resource ID for the PostgreSQL Flexible Server"
}

output "postgres" {
  value = {
    name                = azurerm_postgresql_flexible_server.this.name
    id                  = azurerm_postgresql_flexible_server.this.id
    resource_group_name = azurerm_postgresql_flexible_server.this.resource_group_name
  }
  description = "PostgreSQL Flexible Server"
}

output "private_endpoint_replica" {
  value       = var.tier == "l" ? azurerm_private_endpoint.replica_postgre_pep[0].id : null
  description = "Private Endpoint resource ID for the PostgreSQL Flexible Server Replica"
}

output "postgres_replica" {
  value = var.tier == "l" ? {
    name = azurerm_postgresql_flexible_server.replica[0].name
    id   = azurerm_postgresql_flexible_server.replica[0].id
  } : {}
  description = "PostgreSQL Flexible Server Replica"
}
