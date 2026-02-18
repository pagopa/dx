# Test fixtures - supporting infrastructure required for the test

resource "azurerm_resource_group" "e2e" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = "e2e",
    name          = "cdn",
    resource_type = "resource_group"
  }))
  location = local.environment.location
}

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

# Create a storage account with static website enabled
module "storage_account" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 2.1"

  environment = local.environment

  resource_group_name = azurerm_resource_group.e2e.name
  use_case            = "default"
  subnet_pep_id       = data.azurerm_subnet.pep.id

  force_public_network_access_enabled = true # Public network access enabled for CDN origin reachability

  static_website = {
    enabled        = true
    index_document = "index.html"
  }

  subservices_enabled = {
    blob = true
  }

  tags = local.tags
}
