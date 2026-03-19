# trivy:ignore:AVD-AZU-0015 Content type is optional for secrets
# trivy:ignore:AVD-AZU-0017 Expiration date is optional for long-lived secrets
resource "azurerm_key_vault_secret" "azuread_client_secret" {
  name         = "dx-metrics-azuread-client-secret"
  key_vault_id = var.key_vault_id

  value_wo         = "placeholder"
  value_wo_version = 1
}


# Publicly accessible Container App hosting the Next.js application.
module "container_app" {
  # source  = "pagopa-dx/azure-container-app/azurerm"
  # version = "~> 1.0"
  source = "github.com/pagopa/dx//infra/modules/azure_container_app?ref=allow-container-app-environment-to-have-public-connectivity"

  environment         = merge(var.environment, { env_short = var.environment.environment })
  resource_group_name = var.resource_group_name
  tags                = var.tags

  container_app_environment_id = var.container_app_env_id
  user_assigned_identity_id    = var.container_app_user_assigned_identity_id

  revision_mode = "Single"
  use_case      = "default"

  size = {
    cpu    = 0.5
    memory = "1Gi"
  }

  target_port = 3000

  public_access_enabled = true
  custom_domain = {
    host_name = var.custom_domain_host_name
    dns = {
      zone_name                = "dx.pagopa.it"
      zone_resource_group_name = var.network_resource_group_name
    }
  }

  authentication = {
    azure_active_directory = {
      client_id                  = var.auth_entra_id_client_id
      tenant_id                  = var.tenant_id
      client_secret_key_vault_id = azurerm_key_vault_secret.azuread_client_secret.versionless_id
    }
  }

  secrets = [
    {
      name                = "DATABASE_URL"
      key_vault_secret_id = azurerm_key_vault_secret.database_url.versionless_id
    }
  ]

  container_app_templates = [
    {
      image = var.container_app_image
      name  = "metrics-portal"

      app_settings = {
        NODE_ENV = "production"
        PORT     = "3000"
      }

      liveness_probe = {
        path          = "/api/health"
        initial_delay = 30
        timeout       = 5
        transport     = "HTTP"
      }
    }
  ]

  depends_on = [module.postgres, module.container_app_key_vault_roles]
}
