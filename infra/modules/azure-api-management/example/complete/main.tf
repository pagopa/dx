module "naming_convention" {
  source = "../../../azure-naming-convention"

  environment = local.environment
}

data "azurerm_monitor_action_group" "example" {
  name                = replace("${local.environment.prefix}-${local.environment.env_short}-error", "-", "")
  resource_group_name = "${local.environment.prefix}-${local.environment.env_short}-rg-common"
}

resource "azurerm_resource_group" "example" {
  name     = "${local.project}-${local.environment.domain}-rg-${local.environment.instance_number}"
  location = local.environment.location
}

resource "azurerm_subnet" "example" {
  name                 = "example-subnet"
  virtual_network_name = "${local.project}-common-vnet-01"
  resource_group_name  = "${local.project}-common-rg-01"
  address_prefixes     = ["10.0.1.0/24"]
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
    name                = "${local.project}-common-vnet-01"
    resource_group_name = "${local.project}-common-rg-01"
  }
  subnet_id                     = azurerm_subnet.example.id
  virtual_network_type_internal = true

  action_group_id = data.azurerm_monitor_action_group.example.id

  tags = local.tags
}