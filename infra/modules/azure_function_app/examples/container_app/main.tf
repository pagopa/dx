data "azurerm_client_config" "current" {}

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = "",
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

data "azurerm_log_analytics_workspace" "common" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = "",
    name          = "common",
    resource_type = "log_analytics"
  }))
  resource_group_name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = "",
    name          = "common",
    resource_type = "resource_group"
  }))
}

resource "azurerm_resource_group" "example" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = local.environment.domain,
    resource_type = "resource_group"
  }))
  location = local.environment.location
}

resource "azurerm_user_assigned_identity" "example" {
  name                = "example_cae"
  resource_group_name = azurerm_resource_group.example.name
  location            = local.environment.location

  tags = local.tags
}

data "azurerm_container_app_environment" "cae" {
  name                = "dx-d-itn-playground-poc-cae-01"
  resource_group_name = "dx-d-itn-poc-caef-rg-01"
}

data "azurerm_key_vault" "example" {
  name                = "dx-d-itn-common-kv-01"
  resource_group_name = "dx-d-itn-common-rg-01"
}

module "func" {
  source = "../../"

  container_app_config = {
    environment_id            = data.azurerm_container_app_environment.cae.id
    user_assigned_identity_id = azurerm_user_assigned_identity.example.id
    image                     = "mcr.microsoft.com/azure-functions/dotnet8-quickstart-demo:1.0"
    key_vault = {
      id        = data.azurerm_key_vault.example.id
      tenant_id = data.azurerm_client_config.current.tenant_id
      use_rbac  = true
    }
    min_replicas = 0
  }

  environment         = local.environment
  tier                = "m"
  resource_group_name = azurerm_resource_group.example.name

  virtual_network = {
    name                = local.virtual_network.name
    resource_group_name = local.virtual_network.resource_group_name
  }
  subnet_pep_id = data.azurerm_subnet.pep.id

  app_settings      = {}
  slot_app_settings = {}

  health_check_path = "/"

  tags = local.tags
}
