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
