# Refactor App Service / Function App app settings to support Key Vault references.
# Replace placeholders in angle brackets with project-specific names.

variable "key_vault_name" {
  type        = string
  description = "Name of the Key Vault that stores application secrets."
}

variable "app_settings" {
  type = list(object({
    name                  = string
    value                 = optional(string)
    key_vault_secret_name = optional(string)
  }))
  description = "Application settings. Set key_vault_secret_name for secret-backed values."

  validation {
    condition = alltrue([
      for s in var.app_settings :
      (try(trimspace(s.key_vault_secret_name), "") != "") || (try(s.value, null) != null)
    ])
    error_message = "Each app_settings entry must set either value or key_vault_secret_name."
  }
}

locals {
  app_settings = {
    for setting in var.app_settings :
    setting.name => try(trimspace(setting.key_vault_secret_name), "") != "" ? "@Microsoft.KeyVault(VaultName=${var.key_vault_name};SecretName=${setting.key_vault_secret_name})" : coalesce(setting.value, "")
  }
}

module "<APP_MODULE_NAME>" {
  source  = "pagopa-dx/<APP_MODULE_SOURCE>/azurerm"
  version = "~> <MAJOR.MINOR>"

  app_settings = local.app_settings
}

# Caller example:
# app_settings = [
#   {
#     name                  = "DATABASE_PASSWORD"
#     key_vault_secret_name = "database-password"
#   },
#   {
#     name  = "FEATURE_FLAG"
#     value = "enabled"
#   },
# ]
