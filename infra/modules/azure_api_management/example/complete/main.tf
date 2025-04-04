module "naming_convention" {
  source = "../../../azure_naming_convention"

  environment = local.environment
}

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
  source = "../../"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.example.name
  tier                = "l"

  # Change this values
  publisher_email = "example@pagopa.it"
  publisher_name  = "Example Publisher"

  virtual_network = {
    name                = local.virtual_network.name
    resource_group_name = local.virtual_network.resource_group_name
  }
  subnet_id                     = azurerm_subnet.example.id
  virtual_network_type_internal = true

  tags = local.tags
}
