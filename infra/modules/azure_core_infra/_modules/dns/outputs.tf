output "private_dns_zones" {
  value = { for k, v in azurerm_private_dns_zone.private_dns_zones : k => v }
}