# Expose Key Vault secrets to Azure Container Apps without putting secret values in Terraform.
# Use the DX module shape when available; adapt names and module inputs to the project.

module "container_app" {
  source  = "pagopa-dx/azure-container-app/azurerm"
  version = "~> <MAJOR.MINOR>"

  secrets = [
    {
      name                = "database-password"
      key_vault_secret_id = azurerm_key_vault_secret.database_password.versionless_id
    }
  ]

  containers = [
    {
      image = var.image
      app_settings = {
        FEATURE_FLAG = "enabled"
      }
      secret_names = ["database-password"]

      liveness_probe = {
        path = "/health"
      }
    }
  ]

  depends_on = [module.container_app_key_vault_reader]
}

# Raw azurerm_container_app equivalent when no DX module fits:
resource "azurerm_container_app" "example" {
  name                         = "<CONTAINER_APP_NAME>"
  container_app_environment_id = <CONTAINER_APP_ENVIRONMENT_ID>
  resource_group_name          = <RESOURCE_GROUP_NAME>
  revision_mode                = "Single"

  identity {
    type = "SystemAssigned"
  }

  secret {
    name                = "database-password"
    key_vault_secret_id = azurerm_key_vault_secret.database_password.versionless_id
    identity            = "System"
  }

  template {
    container {
      name   = "app"
      image  = var.image
      cpu    = 0.5
      memory = "1Gi"

      env {
        name        = "DATABASE_PASSWORD"
        secret_name = "database-password"
      }
    }
  }

  depends_on = [azurerm_role_assignment.container_app_key_vault_reader]
}
