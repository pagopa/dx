
output "delegated_subnet_id" {
  value       = azurerm_subnet.this.id
  description = "Subnet ID in which to create the PostgreSQL Flexible Server"
}

output "private_dns_zone_id" {
  value       = azurerm_private_dns_zone.this.id
  description = "The ID of the private dns zone to create the PostgreSQL Flexible Server"
}

output "postgres" {
  value = {
    name = azurerm_postgresql_flexible_server.this.name
    id   = azurerm_postgresql_flexible_server.this.id
  }
  description = "PostgreSQL Flexible Server"
}


output "delegated_subnet_id_replica" {

  value       = var.tier == "premium" ? azurerm_subnet.replica[0].id : null
  description = "Subnet ID in which to create the PostgreSQL Flexible Server Replica"
}

output "postgres_replica" {
  value = var.tier == "premium" ? {
    name = azurerm_postgresql_flexible_server.replica[0].name
    id   = azurerm_postgresql_flexible_server.replica[0].id
  } : {}
  description = "PostgreSQL Flexible Server Replica"
}
