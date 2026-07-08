resource "azurerm_resource_group" "example" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = local.environment.app_name,
    resource_type = "resource_group"
  }))
  location = local.environment.location
}

data "azurerm_log_analytics_workspace" "common" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = ""
    name          = "common"
    resource_type = "log_analytics"
  }))
  resource_group_name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = ""
    name          = "common"
    resource_type = "resource_group"
  }))
}

module "azure_apim" {
  source  = "pagopa-dx/azure-api-management/azurerm"
  version = "~> 3.1"

  environment                = local.environment
  resource_group_name        = azurerm_resource_group.example.name
  use_case                   = "high_load"
  log_analytics_workspace_id = data.azurerm_log_analytics_workspace.common.id

  publisher_email = "example@pagopa.it"
  publisher_name  = "Example Publisher"

  virtual_network = {
    name                = local.virtual_network.name
    resource_group_name = local.virtual_network.resource_group_name
  }

  hostname_configuration = {
    proxy = {
      use_resource_name_as_default = true
    }
    management = [
      {
        host_name                = "management.example.com"
        key_vault_certificate_id = "https://dx-d-itn-common-kv-01.vault.azure.net/secrets/cert1/latest"
      }
    ]
  }

  autoscale = {
    minimum_instances             = 4
    default_instances             = 4
    maximum_instances             = 8
    scale_out_capacity_percentage = 60
  }

  tags = local.tags
}
