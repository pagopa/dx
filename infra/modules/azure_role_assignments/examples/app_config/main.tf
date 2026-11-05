resource "azurerm_resource_group" "roles" {
  name     = "${local.resource_prefix}-${local.environment.domain}-roles-rg-${local.environment.instance_number}"
  location = local.environment.location

  tags = local.tags
}

module "test_app" {
  source  = "pagopa-dx/azure-function-app-exposed/azurerm"
  version = "~> 5.0"

  environment = merge(local.naming_config, {
    app_name = "roles"
  })

  resource_group_name = azurerm_resource_group.roles.name
  health_check_path   = "/api/v1/info"
  node_version        = 22

  size = "P0v3"

  app_settings      = {}
  slot_app_settings = {}

  tags = local.tags
}

resource "azurerm_app_configuration" "this" {
  name                = "dx-d-itn-modules-role-appconfig-01"
  resource_group_name = azurerm_resource_group.roles.name
  location            = local.environment.location

  local_auth_enabled       = false
  public_network_access    = "Enabled"
  purge_protection_enabled = false

  tags = local.tags
}

module "roles" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 4.0"

  principal_id    = module.test_app.function_app.function_app.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  app_config = [
    {
      name                = azurerm_app_configuration.this.name
      resource_group_name = azurerm_app_configuration.this.resource_group_name
      description         = "Complete access to app configuration control plane and data"
      role                = "owner"
    }
  ]
}
