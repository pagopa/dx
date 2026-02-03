resource "azurerm_resource_group" "example" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = local.environment.app_name,
    resource_type = "resource_group"
  }))
  location = local.environment.location
}

resource "azurerm_subnet" "example" {
  name                 = "example-subnet"
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
  address_prefixes     = ["10.50.250.0/24"]
}

module "azure_apim" {
  source  = "pagopa-dx/azure-api-management/azurerm"
  version = "~> 2.2"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.example.name
  use_case            = "high_load"

  # Change this values
  publisher_email = "example@pagopa.it"
  publisher_name  = "Example Publisher"

  virtual_network = {
    name                = local.virtual_network.name
    resource_group_name = local.virtual_network.resource_group_name
  }
  subnet_id                     = azurerm_subnet.example.id
  virtual_network_type_internal = true

  hostname_configuration = {
    proxy = [
      {
        default_ssl_binding = false
        host_name           = "api.example.com"
        key_vault_id        = null
      },
      {
        default_ssl_binding = true
        host_name           = "api2.example.com"
        key_vault_id        = "https://dx-d-itn-common-kv-01.vault.azure.net/secrets/cert1"
      },
      {
        default_ssl_binding = false
        host_name           = "api3.example.com"
        key_vault_id        = "https://dx-d-itn-common-kv-01.vault.azure.net/secrets/cert2"
      },
    ]
    developer_portal = null
    management       = null
    portal           = null
  }

  autoscale = {
    enabled                       = true
    minimum_instances             = 4
    default_instances             = 4
    maximum_instances             = 8
    scale_out_capacity_percentage = 60
  }

  tags = local.tags
}
