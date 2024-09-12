
output "delegated_subnet_id" {
  value       = local.delegated_subnet_id
  description = "Subnet ID in which to create the PostgreSQL Flexible Server"
}

output "private_dns_zone_id" {
  value       = local.private_dns_zone_id
  description = "The ID of the private dns zone to create the PostgreSQL Flexible Server"
}

output "postgres" {
  value = {
    name = azurerm_postgresql_flexible_server.this.name
    id   = azurerm_postgresql_flexible_server.this.id
  }
  description = "PostgreSQL Flexible Server"
}