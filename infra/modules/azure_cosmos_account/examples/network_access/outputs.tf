output "public_account_name" {
  value = module.public_cosmos_account.name
}

output "private_account_name" {
  value = module.private_cosmos_account.name
}

output "public_app_ip_address" {
  value = azurerm_container_group.public_app.ip_address
}

output "private_app_ip_address" {
  value = azurerm_container_group.private_app.ip_address
}

