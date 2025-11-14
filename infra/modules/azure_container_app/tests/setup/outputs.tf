output "resource_group_name" {
  value = data.azurerm_resource_group.rg.name
}

output "container_app_environment_id" {
  value = data.azurerm_container_app_environment.cae.id
}

output "key_vault_secret1" {
  value = {
    secret_id = azurerm_key_vault_secret.test1.versionless_id
    name      = "${azurerm_key_vault_secret.test1.name}_SECRET"
  }
}

output "key_vault_secret2" {
  value = {
    secret_id = azurerm_key_vault_secret.test2.versionless_id
    name      = azurerm_key_vault_secret.test2.name
  }
}

output "tags" {
  value = local.tags
}

output "environment" {
  value = local.environment
}

output "user_assigned_identity_id" {
  value = azurerm_user_assigned_identity.cae.id
}

output "key_vault_name" {
  value = data.azurerm_key_vault.kv.name
}

output "subnet_pep_id" {
  value = data.azurerm_subnet.pep.id
}

output "private_dns_zone_resource_group_id" {
  value = data.azurerm_resource_group.network.id
}

output "appi" {
  value     = data.azurerm_application_insights.common
  sensitive = true
}
