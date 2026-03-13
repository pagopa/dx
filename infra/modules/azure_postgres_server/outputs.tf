output "private_endpoint" {
  description = "The resource ID of the Private Endpoint associated with the PostgreSQL Flexible Server."
  value       = var.delegated_subnet_id == null ? azurerm_private_endpoint.postgre_pep[0].id : null
}

output "postgres" {
  description = "Details of the PostgreSQL Flexible Server, including its name, ID, and resource group name."
  value = {
    name                = azurerm_postgresql_flexible_server.this.name
    id                  = azurerm_postgresql_flexible_server.this.id
    resource_group_name = azurerm_postgresql_flexible_server.this.resource_group_name
  }
}

output "private_endpoint_replica" {
  description = "The resource ID of the Private Endpoint associated with the PostgreSQL Flexible Server Replica. Returns null if the tier is not 'l'."
  value       = local.replica.create == true && var.delegated_subnet_id == null ? azurerm_private_endpoint.replica_postgre_pep[0].id : null
}

output "postgres_replica" {
  description = "Details of the PostgreSQL Flexible Server Replica, including its name and ID. Returns an empty object if the tier is not 'l'."
  value = local.replica.create == true ? {
    name = azurerm_postgresql_flexible_server.replica[0].name
    id   = azurerm_postgresql_flexible_server.replica[0].id
  } : {}
}
