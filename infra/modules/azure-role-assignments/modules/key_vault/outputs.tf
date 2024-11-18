output "access_policy" {
  value = azurerm_key_vault_access_policy.this
}

output "secrets_role_assignment" {
  value = azurerm_role_assignment.secrets
}

output "keys_role_assignment" {
  value = azurerm_role_assignment.keys
}

output "certificates_role_assignment" {
  value = azurerm_role_assignment.certificates
}