
output "private_endpoint" {

  value       = azurerm_private_endpoint.mysql_pe.id
  description = "Subnet ID in which to create the MySQL Flexible Server Replica"
}

output "mysql" {
  value = {
    name = azurerm_mysql_flexible_server.this.name
    id   = azurerm_mysql_flexible_server.this.id
  }
  description = "MySQL Flexible Server"
}

output "private_endpoint_replica" {

  value       = var.tier == "premium" ? azurerm_private_endpoint.replica_mysql_pe[0].id : null
  description = "Subnet ID in which to create the MySQL Flexible Server Replica"
}

output "mysql_replica" {
  value = var.tier == "premium" ? {
    name = azurerm_mysql_flexible_server.replica[0].name
    id   = azurerm_mysql_flexible_server.replica[0].id
  } : {}
  description = "MySQL Flexible Server Replica"
}
