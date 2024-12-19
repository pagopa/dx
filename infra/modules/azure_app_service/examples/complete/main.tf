module "naming_convention" {
  source = "../../../azure_naming_convention"

  environments = [local.environment]
}

data "azurerm_subnet" "pep" {
  name                 = "${local.project}-pep-snet-01"
  virtual_network_name = "${local.project}-common-vnet-01"
  resource_group_name  = "${local.project}-network-rg-01"
}

resource "azurerm_resource_group" "example" {
  name     = module.naming_convention.name.resource_group["1"]
  location = local.environment.location
}

resource "azurerm_user_assigned_identity" "example" {
  name                = "example"
  resource_group_name = azurerm_resource_group.example.name
  location            = local.environment.location
}

module "azure_app_service" {
  source = "../../"

  environment         = local.environment
  tier                = "l"
  resource_group_name = azurerm_resource_group.example.name

  virtual_network = {
    name                = "${local.project}-common-vnet-01"
    resource_group_name = "${local.project}-network-rg-01"
  }
  subnet_pep_id = data.azurerm_subnet.pep.id
  subnet_cidr   = "10.50.250.0/24"

  app_settings      = {}
  slot_app_settings = {}

  health_check_path = "/health"

  tags = local.tags
}
