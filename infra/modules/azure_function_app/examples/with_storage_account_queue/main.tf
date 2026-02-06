data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

resource "azurerm_resource_group" "example" {
  name     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "resource_group" }))
  location = local.environment.location
}

resource "azurerm_storage_account" "external" {
  name                     = provider::dx::resource_name(merge(local.naming_config, { name = "external", resource_type = "storage_account" }))
  location                 = local.environment.location
  resource_group_name      = azurerm_resource_group.example.name
  account_tier             = "Standard"
  account_kind             = "StorageV2"
  account_replication_type = "LRS"

  public_network_access_enabled   = false
  default_to_oauth_authentication = true

  tags = local.tags
}

module "azure_function_app" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 4.1"

  environment         = local.environment
  use_case            = "default"
  resource_group_name = azurerm_resource_group.example.name

  virtual_network = {
    name                = local.virtual_network.name
    resource_group_name = local.virtual_network.resource_group_name
  }
  subnet_pep_id = data.azurerm_subnet.pep.id
  subnet_cidr   = "10.50.248.0/24"

  app_settings = {
    AzureWebJobsStorage__accountName     = azurerm_storage_account.external.name
    AzureWebJobsStorage__queueServiceUri = azurerm_storage_account.external.primary_queue_endpoint
  }
  slot_app_settings = {}

  health_check_path = "/health"

  tags = local.tags
}
