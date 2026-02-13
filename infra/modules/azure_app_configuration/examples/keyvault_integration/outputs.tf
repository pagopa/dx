output "name" {
  value = module.appcs_with_kv.name
}

output "private_app_ip_address" {
  value = azurerm_container_group.private_app.ip_address
}
