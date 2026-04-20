data "azurerm_subscription" "current" {}

module "observability_reader" {
  source = "../.."

  scope = data.azurerm_subscription.current.id

  role_name = "dx-observability-reader"
  source_roles = [
    "Reader",
    "Monitoring Reader",
  ]

  description = "Custom role for observability read access"
}

output "custom_role_id" {
  description = "Resource ID of the merged custom role"
  value       = module.observability_reader.custom_role_id
}

output "custom_role_name" {
  description = "Name of the merged custom role"
  value       = module.observability_reader.custom_role_name
}