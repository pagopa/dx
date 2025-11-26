output "name" {
  value = module.private_appcs.name
}

output "public_app_ip_address" {
  value = azurerm_container_group.public_app.ip_address
}

output "private_app_ip_address" {
  value = azurerm_container_group.private_app.ip_address
}
